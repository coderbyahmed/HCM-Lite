import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { connectDatabase } from '../src/database/db.js';
import { config } from '../src/config/env.js';

const usesMongoTestDatabase = config.env !== 'test';

test(
  'MongoDB CRUD record survives reconnect and is removed afterward',
  { skip: !usesMongoTestDatabase },
  async () => {
    const Probe = mongoose.models.HcmPersistenceProbe || mongoose.model(
      'HcmPersistenceProbe',
      new mongoose.Schema(
        { marker: { type: String, required: true, unique: true }, value: { type: String, required: true } },
        { collection: 'hcm_persistence_probes' }
      )
    );
    const marker = randomUUID();
    let probeId;

    try {
      await connectDatabase();
      const created = await Probe.create({ marker, value: 'created' });
      probeId = created._id;

      const found = await Probe.findById(probeId);
      assert.equal(found.value, 'created');

      await Probe.updateOne({ _id: probeId }, { $set: { value: 'updated' } });
      await mongoose.disconnect();
      await connectDatabase();

      const persisted = await Probe.findById(probeId);
      assert.equal(persisted.value, 'updated');

      await Probe.deleteOne({ _id: probeId });
      assert.equal(await Probe.findById(probeId), null);
    } finally {
      if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
      }
      if (probeId) await Probe.deleteOne({ _id: probeId });
      await mongoose.disconnect();
    }
  }
);
