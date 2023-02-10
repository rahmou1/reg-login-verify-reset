const expressAsyncHandler = require("express-async-handler");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const generateToken = require("../../config/token/generateToken");
const User = require("../../model/user/User");
const validateMongodId = require("../../utils/validateMongodbID");
const dotenv = require("dotenv");
const cloudinaryUploadImg = require("../../utils/cloudinary");
const fs = require("fs");
dotenv.config();
sgMail.setApiKey(process.env.SEND_GRID_API_KEY);

//-----------------------------------------
//Register
//-----------------------------------------
const userRegisterCtrl = expressAsyncHandler(async (req, res) => {
  //Check if the user is already registered
  const userExists = await User.findOne({ email: req?.body?.email });

  if (userExists) throw new Error("user already exist");

  try {
    const user = await User.create({
      firstName: req?.body?.firstName,
      lastName: req?.body?.lastName,
      email: req?.body?.email,
      password: req?.body?.password,
    });
    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//Login
//-----------------------------------------
const loginUserCtrl = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //* Check if the user exist
  const userFound = await User.findOne({ email });
  //* Check if the password is match
  if (userFound && (await userFound.isPasswordMatched(password))) {
    res.json({
      _id: userFound?._id,
      firstName: userFound?.firstName,
      lastName: userFound?.lastName,
      email: userFound?.email,
      profilePhoto: userFound?.profilePhoto,
      isAdmin: userFound?.isAdmin,
      token: generateToken(userFound?.id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Credentials");
  }
});
//-----------------------------------------
//Fetch All users
//-----------------------------------------
const fetchUsersCtrl = expressAsyncHandler(async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    res.json(error);
  }
});

//-----------------------------------------
//Delete User
//-----------------------------------------
const deleteUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  // Check if the user id is valid
  validateMongodId(id);
  try {
    const deletedUser = await User.findByIdAndDelete(id).select("-password");
    res.json(deletedUser);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//Get Specific User
//-----------------------------------------
const fetchUserDetailsCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  //Check if the user id valid
  validateMongodId(id);
  try {
    const user = await User.findById(id).select("-password");
    res.json(user);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//User Profile
//-----------------------------------------
const userProfileCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodId(id);
  try {
    const myProfile = await User.findById(id).select("-password");
    res.json(myProfile);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//Update Profile
//-----------------------------------------
const updateUserCtrl = expressAsyncHandler(async (req, res) => {
  const { _id } = req?.user;
  validateMongodId(_id);
  try {
    const user = await User.findByIdAndUpdate(
      _id,
      {
        firstName: req?.body?.firstName,
        lastName: req?.body?.lastName,
        email: req?.body?.email,
        bio: req?.body?.bio,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//Update Password
//-----------------------------------------
const updateUserPasswordCtrl = expressAsyncHandler(async (req, res) => {
  try {
    //destructure the login user
    const { _id } = req.user;
    const { password } = req.body;
    validateMongodId(_id);
    //find the user by _id
    const user = await User.findById(_id).select("-password");
    if (password) {
      user.password = password;
      const updatedUser = await user.save();
      res.json(updatedUser);
    }
    return;
  } catch (error) {
    res.json(error);
  }
});

//-----------------------------------------
//Following
//-----------------------------------------
const followingUserCtrl = expressAsyncHandler(async (req, res) => {
  //Update the login user following
  const { followId } = req.body;
  const loginUserId = req.user.id;

  const targetUser = await User.findById(followId);
  try {
    const alreadyFollowing = targetUser?.followers?.find(
      (user) => user?.toString() === loginUserId.toString()
    );
    if (alreadyFollowing) {
      throw new Error(`You already follow this user ${targetUser.email}`);
    }

    //find the login target user and check if the login user id exist
    //Finding the user you want to follow and update his followers
    await User.findByIdAndUpdate(
      followId,
      {
        $push: { followers: loginUserId },
        isFollowing: true,
      },
      { new: true }
    );
    //Update the login user following
    await User.findByIdAndUpdate(
      loginUserId,
      {
        $push: { following: followId },
      },
      { new: true }
    );
    res.json(`You have successfully followed ${targetUser.email}`);
  } catch (error) {
    res.json(error.message);
  }
});

//-----------------------------------------
//unFollow
//-----------------------------------------
const unfollowUserCtrl = expressAsyncHandler(async (req, res) => {
  //Update the login user following
  const { unfollowId } = req.body;
  const loginUserId = req.user.id;
  const targetUser = await User.findById(unfollowId);
  try {
    await User.findByIdAndUpdate(
      unfollowId,
      {
        $pull: { followers: loginUserId },
        isFollowing: false,
      },
      { new: true }
    );
    await User.findByIdAndUpdate(
      loginUserId,
      {
        $pull: { following: unfollowId },
      },
      { new: true }
    );
    res.json(`You have successfully unfollow ${targetUser.email}`);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//BlockUser
//-----------------------------------------
const blockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodId(id);
  try {
    const user = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.json(error);
  }
});
//-----------------------------------------
//unBlockUser
//-----------------------------------------
const unBlockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodId(id);
  try {
    const user = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.json(error);
  }
});

//-----------------------------------------
//Generate email verification token
//-----------------------------------------
const generateVerificationTokenCtrl = expressAsyncHandler(async (req, res) => {
  const loginUserId = req.user.id;
  const user = await User.findById(loginUserId);
  try {
    //Generate Token
    const verificationToken = await user.createAccountVerificationToken();
    console.log(user.email);
    // save the user
    await user.save();
    //build MSG
    const resetURL = `If you were requested to verify your account ${user.email}, verify now within 10 minutes
    , otherwise ignore this message <a href="http://localhost:3000/verify-account/${verificationToken}">
    Click to verify your account</a>`;
    const msg = {
      to: user.email,
      from: "info@rahmou.com",
      subject: "Verify Account",
      html: resetURL,
    };
    await sgMail.send(msg);
    res.json(resetURL);
  } catch (error) {
    res.json(error);
  }
});

//-----------------------------------------
//Account Verification
//-----------------------------------------
const accountVerificationCtrl = expressAsyncHandler(async (req, res) => {
  const { token } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  //Find the user by token
  const userFound = await User.findOne({
    accountVerificationToken: hashedToken,
    // accountVerificationTokenExpires: { $gte: new Date() },
  }).select("-password");
  console.log(userFound);
  if (!userFound) throw new Error("Token Expired, try again later");
  //Update the user verification to true
  userFound.isAccountVerified = true;
  userFound.accountVerificationToken = undefined;
  userFound.accountVerificationTokenExpires = undefined;
  await userFound.save();
  res.json(userFound);
});

//-----------------------------------------
//Forget Password token generator
//-----------------------------------------
const forgetPasswordTokenCtrl = expressAsyncHandler(async (req, res) => {
  //find user by email
  const { email } = req.body;
  const user = await User.findOne({ email }).select("-password");
  if (!user) throw new Error("User Not Found");

  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    //build MSG
    const resetURL = `If you were requested to reset your password, reset now within 10 minutes
        , otherwise ignore this message <a href="http://localhost:3000/reset-password/${token}">
        Click to reset your account</a>`;
    const msg = {
      to: email,
      from: "info@rahmou.com",
      subject: "Reset Password",
      html: resetURL,
    };
    await sgMail.send(msg);
    res.json({
      msg: `A verification message is successfully sent to ${user?.email}. Reset now within 
    10 Minutes, ${resetURL}`,
    });
  } catch (error) {}
});

//-----------------------------------------
//Password Reset
//-----------------------------------------
const passwordResetCtrl = expressAsyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  //find this user by token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error("Token Expired, try again later");
  //update/change the Password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

//-----------------------------------------
//Profile photo upload
//-----------------------------------------
const profilePhotoUploadCtrl = expressAsyncHandler(async (req, res) => {
  //Find the login user
  const { _id } = req.user;

  //Get the path to the img
  const localPath = `public/images/profile/${req.file.filename}`;
  //upload to cloudinary
  const imgUploaded = await cloudinaryUploadImg(localPath);
  const foundUser = await User.findByIdAndUpdate(
    _id,
    {
      profilePhoto: imgUploaded?.url,
    },
    { new: true }
  ).select("-password");
  //After uploading the image deleting it from the directory
  fs.unlinkSync(localPath);
  res.json(foundUser);
});

//-----------------------------------------
//Exporting all controllers
//-----------------------------------------
module.exports = {
  userRegisterCtrl,
  loginUserCtrl,
  fetchUsersCtrl,
  deleteUserCtrl,
  fetchUserDetailsCtrl,
  userProfileCtrl,
  updateUserCtrl,
  updateUserPasswordCtrl,
  followingUserCtrl,
  unfollowUserCtrl,
  blockUserCtrl,
  unBlockUserCtrl,
  generateVerificationTokenCtrl,
  accountVerificationCtrl,
  forgetPasswordTokenCtrl,
  passwordResetCtrl,
  profilePhotoUploadCtrl,
};
