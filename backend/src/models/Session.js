import mongoose from 'mongoose';

/**
 * A Debug Session links snapshots from different machines so devs can
 * compare environments and generate a reproducible bridge.
 */
const sessionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: String,
    slug: { type: String, required: true, unique: true }, // short share code e.g. "abc123"

    // Status
    status: {
      type: String,
      enum: ['open', 'resolved', 'archived'],
      default: 'open',
    },

    // Error context
    errorMessage: String,  // the actual error the reporter is seeing
    errorStack: String,
    reproSteps: String,    // markdown steps to reproduce

    // The "it works" snapshot (reporter's machine)
    reporterSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' },

    // Additional snapshots (other machines, CI, colleague)
    compareSnapshots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' }],

    // Resolved bridge — the final reproduction environment
    resolvedBridge: {
      dockerfile: String,
      setupSh: String,
      envTemplate: String,
      dockerCompose: String,
      notes: String,
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Collaboration
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Visibility
    isPublic: { type: Boolean, default: false },
    views: { type: Number, default: 0 },

    tags: [String],
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

sessionSchema.index({ slug: 1 }, { unique: true });
sessionSchema.index({ owner: 1, status: 1 });
sessionSchema.index({ isPublic: 1, status: 1 });

sessionSchema.virtual('snapshotCount').get(function () {
  return (this.reporterSnapshot ? 1 : 0) + (this.compareSnapshots?.length || 0);
});

export const Session = mongoose.model('Session', sessionSchema);
