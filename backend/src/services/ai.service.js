import { GoogleGenAI, Type } from '@google/genai';
import { Company, Employee, Attendance, LeaveRequest, Payroll, Department } from '../models/index.js';
import { getLeaveBalance, calculateLeaveDays } from './leave.service.js';
import { config } from '../config/env.js';

let aiClient = null;

const getAiClient = () => {
  if (!config.ai.apiKey) {
    const error = new Error('AI assistance is unavailable until GEMINI_API_KEY is configured.');
    error.statusCode = 503;
    throw error;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: config.ai.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
};

// Tool Function Declarations
const companyPoliciesTool = {
  name: 'getCompanyPolicies',
  description: 'Retrieve company work schedule, attendance grace period, office coordinates, leave quotas, and tax slab policies.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const employeeDirectoryTool = {
  name: 'getEmployeeDirectory',
  description: 'Search or retrieve employee records. Note: Salary and private compensation are automatically redacted if requester is an Employee.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      searchTerm: {
        type: Type.STRING,
        description: 'Optional name, email, or department search filter',
      },
    },
  },
};

const attendanceSummaryTool = {
  name: 'getAttendanceSummary',
  description: 'Retrieve attendance statistics, late occurrences, and working hours for an employee or company date.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      employeeCode: {
        type: Type.STRING,
        description: 'Employee code (e.g. EMP-001). Leave empty to query current user or company today.',
      },
      date: {
        type: Type.STRING,
        description: 'Optional date YYYY-MM-DD',
      },
    },
  },
};

const leaveBalanceTool = {
  name: 'getLeaveBalance',
  description: 'Retrieve current leave quotas, used leaves, and remaining balance (casual, sick, annual, unpaid).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      employeeCode: {
        type: Type.STRING,
        description: 'Employee code. If omitted, checks current requesting user.',
      },
    },
  },
};

const calculateLeaveDaysTool = {
  name: 'calculateLeaveDays',
  description: 'Calculate eligible working days between start date and end date excluding company weekends and official holidays.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      startDate: {
        type: Type.STRING,
        description: 'Start date in YYYY-MM-DD format',
      },
      endDate: {
        type: Type.STRING,
        description: 'End date in YYYY-MM-DD format',
      },
    },
    required: ['startDate', 'endDate'],
  },
};

// Tool Executor Handler with Role-Based Scoping
export const executeAiTool = async (callName, args = {}, user, company = null) => {
  if (callName === 'getCompanyPolicies') {
    return {
      companyName: company?.name || 'HCM Lite',
      officeStartTime: company?.settings?.officeStartTime || '09:00',
      gracePeriodMinutes: company?.settings?.gracePeriodMinutes || 15,
      halfDayThresholdHours: company?.settings?.halfDayThresholdHours || 5,
      weekends: company?.settings?.weekends || ['Saturday', 'Sunday'],
      leaveQuotas: company?.settings?.leaveQuotas,
      holidays: company?.settings?.holidays,
      taxSlabs: [
        'Up to 600,000: 0%',
        '600,001 to 1,200,000: 5% of excess over 600,000',
        '1,200,001 to 2,400,000: 30,000 + 15% of excess over 1,200,000',
        '2,400,001 to 3,600,000: 210,000 + 25% of excess over 2,400,000',
        'Above 3,600,000: 510,000 + 35% of excess over 3,600,000',
      ],
    };
  }

  if (callName === 'getEmployeeDirectory') {
    const emps = await Employee.find({ employmentStatus: { $ne: 'Terminated' } });
    const departments = await Department.find({});
    const deptMap = Object.fromEntries(departments.map((d) => [d._id, d.name]));

    return emps.map((e) => {
      const isSelf = String(user.employeeId) === String(e._id);
      const canViewSalary = user.role === 'Admin' || user.role === 'HR' || isSelf;

      return {
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        department: deptMap[e.departmentId] || 'Unassigned',
        joiningDate: e.joiningDate,
        salaryStructure: canViewSalary ? e.salaryStructure : '[REDACTED - Confidential]',
      };
    });
  }

  if (callName === 'getAttendanceSummary') {
    let targetEmpId = user.employeeId;
    if (args.employeeCode && (user.role === 'Admin' || user.role === 'HR')) {
      const found = await Employee.findOne({ employeeCode: args.employeeCode });
      if (found) targetEmpId = found._id;
    }

    const todayStr = args.date || new Date().toISOString().split('T')[0];
    const todayRecord = targetEmpId ? await Attendance.findOne({ employeeId: targetEmpId, date: todayStr }) : null;
    const recent = targetEmpId ? await Attendance.find({ employeeId: targetEmpId }).sort({ date: -1 }).limit(7) : [];

    return {
      queryDate: todayStr,
      todayRecord,
      recentRecords: recent,
    };
  }

  if (callName === 'getLeaveBalance') {
    let targetEmpId = user.employeeId;
    if (args.employeeCode && (user.role === 'Admin' || user.role === 'HR')) {
      const found = await Employee.findOne({ employeeCode: args.employeeCode });
      if (found) targetEmpId = found._id;
    }

    if (!targetEmpId) return { error: 'No employee record linked to user account.' };
    return getLeaveBalance(targetEmpId);
  }

  if (callName === 'calculateLeaveDays') {
    return calculateLeaveDays(args.startDate, args.endDate);
  }

  return { error: `Tool ${callName} not implemented.` };
};

const withTimeout = (promise, ms = 30000) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`AI request timed out after ${ms}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const generateAiContent = async (ai, request) => {
  try {
    return await withTimeout(
      ai.models.generateContent(request),
      config.ai.timeoutMs || 30000
    );
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.error('[ERROR] Gemini API request timed out.');
      const timeoutError = new Error('Gemini did not respond in time. Please try again.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    const upstreamStatus = Number(error.status);
    let message = 'Gemini API request failed. Check the backend AI configuration and network access.';
    let statusCode = 502;

    if (upstreamStatus === 401 || upstreamStatus === 403) {
      message = 'Gemini rejected the configured API credentials. Verify GEMINI_API_KEY and its API access.';
      statusCode = 503;
    } else if (upstreamStatus === 404) {
      message = 'The configured Gemini model was not found. Verify AI_MODEL.';
      statusCode = 503;
    } else if (upstreamStatus === 429) {
      message = 'Gemini quota or rate limit reached. Check the API quota and try again later.';
      statusCode = 503;
    } else if (upstreamStatus >= 500) {
      message = 'Gemini is temporarily unavailable. Please try again later.';
    }

    console.error(
      `[ERROR] Gemini API request failed (${Number.isFinite(upstreamStatus) ? `HTTP ${upstreamStatus}` : 'network error'}).`
    );
    const requestError = new Error(message);
    requestError.statusCode = statusCode;
    throw requestError;
  }
};

export const chatWithAi = async ({ message, chatHistory = [], user }) => {
  const ai = getAiClient();
  const company = await Company.findOne({});

  const executeToolCall = async (callName, args = {}) => {
    return executeAiTool(callName, args, user, company);
  };

  const systemInstruction = `You are HCM Copilot, the intelligent human capital management assistant for ${company?.name || 'HCM Lite'}.
Acting User Profile:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Linked Employee ID: ${user.employeeId || 'None'}

Strict Security & Confidentiality Rules:
1. Role Boundaries:
   - If user role is "Employee": NEVER disclose another employee's salary, basic pay, allowances, tax, or confidential contact info. If asked, respond politely that compensation data is confidential and restricted.
   - If user role is "HR" or "Admin": You may assist with organizational analytics, employee summaries, department totals, and company policies.
2. Calculations:
   - Gross salary = 1.5 * Basic salary.
   - HRA = 40% of Basic, Medical = 10% of Basic.
   - Office start: ${company?.settings?.officeStartTime || '09:00'} (Grace period: ${company?.settings?.gracePeriodMinutes || 15} minutes).
3. Use the provided tools to fetch factual data whenever relevant. Format numbers clearly with PKR currency where applicable. Keep responses concise, professional, and helpful.`;

  const tools = [
    {
      functionDeclarations: [
        companyPoliciesTool,
        employeeDirectoryTool,
        attendanceSummaryTool,
        leaveBalanceTool,
        calculateLeaveDaysTool,
      ],
    },
  ];

  const contents = [];
  for (const h of chatHistory.slice(-6)) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const response = await generateAiContent(ai, {
    model: config.ai.model || 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction,
      tools,
    },
  });

  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    const toolResults = [];
    for (const call of functionCalls) {
      const result = await executeToolCall(call.name, call.args);
      toolResults.push({
        toolName: call.name,
        args: call.args,
        result,
      });
    }

    const followupContents = [
      ...contents,
      response.candidates[0].content,
      {
        role: 'user',
        parts: toolResults.map((tr) => ({
          text: `Tool Result for ${tr.toolName}: ${JSON.stringify(tr.result)}`,
        })),
      },
    ];

    const followupResponse = await generateAiContent(ai, {
      model: config.ai.model || 'gemini-3.8-flash',
      contents: followupContents,
      config: { systemInstruction },
    });

    return {
      reply: followupResponse.text,
      toolCalls: toolResults,
    };
  }

  return {
    reply: response.text,
    toolCalls: [],
  };
};

export const generateExecutiveSummary = async (user) => {
  const ai = getAiClient();
  const company = await Company.findOne({});
  const employees = await Employee.find({ employmentStatus: { $ne: 'Terminated' } });
  const todayStr = new Date().toISOString().split('T')[0];
  const attendances = await Attendance.find({ date: todayStr });
  const leaves = await LeaveRequest.find({ status: 'approved', startDate: { $lte: todayStr }, endDate: { $gte: todayStr } });

  const summaryData = {
    company: company?.name || 'HCM Lite',
    headcount: employees.length,
    presentToday: attendances.filter((a) => ['present', 'on_time', 'half_day'].includes(a.status)).length,
    lateToday: attendances.filter((a) => a.status === 'late').length,
    onLeaveToday: leaves.length,
  };

  const prompt = `Generate a 2-3 sentence executive human capital daily operational summary based on these statistics: ${JSON.stringify(summaryData)}. Highlight attendance health, staffing capacity, and action items for ${user.role}.`;

  const res = await generateAiContent(ai, {
    model: config.ai.model || 'gemini-3.8-flash',
    contents: prompt,
  });

  return res.text;
};
