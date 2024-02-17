module.exports = (schemaInstance, mongoose) => {
  return mongoose.model(
    "notifies",
    schemaInstance(
      {
        note: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "message",
        },
        notifyUsers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
          },
        ],
      },
      { timestamps: true }
    )
  );
};
