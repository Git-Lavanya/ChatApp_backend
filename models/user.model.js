module.exports = (schemaInstance, mongoose) => {
  return mongoose.model(
    "users",
    schemaInstance({
      username: String,
      password: String,
      profile_pic: {
        image: Buffer,
        contentType: String,
      },
    })
  );
};
