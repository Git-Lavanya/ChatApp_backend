module.exports = (schemaInstance, mongoose) => {
  return mongoose.model(
    "message",
    schemaInstance(
      {
        content: String,
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "chat",
        },
      },
      { timestamp: true }
    )
  );
};
