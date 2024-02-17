module.exports = (schemaInstance, mongoose) => {
  return mongoose.model(
    "chat",
    schemaInstance(
      {
        chatName: String,
        isGroupChat: { type: Boolean, default: false },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
          },
        ],
        groupAdmin: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        latestMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "message",
        },
      },
      { timestamps: true }
    )
  );
};
