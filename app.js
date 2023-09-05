// import 'dotenv/config'
// import express from "express"
// import bodyParser from 'body-parser';
// import ejs from "ejs"
// import mongoose from 'mongoose';
// import session from 'express-session';
// import passport from 'passport';
// import passportLocalMongoose from "passport-local-mongoose"
// import { Strategy as GoogleStrategy} from 'passport-google-oauth20'

require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreatePlugin = require('./findOrCreate')

const app = express();

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


app.use(passport.initialize());
app.use(passport.session());
// app.set("view engine", 'ejs')

// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreatePlugin);


mongoose.connect("mongodb://127.0.0.1:27017/userDB");


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home.ejs");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login.ejs");
});
app.get("/register", function(req, res){
  res.render("register.ejs");
});

app.get("/secrets", async function(req, res){
//   if (req.isAuthenticated()){
//     res.render("secrets.ejs");
//   } else {
//     res.redirect("/login");
//   }

    const sec = await User.find({"secret": {$ne: null}})
    res.render("secrets.ejs" , {userWithSecret: sec});
      
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()){
        res.render("submit.ejs");
      } else {
        res.redirect("/login");
      }
})

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    console.log(req.user.id)
    User.findById(req.user.id).exec().then(function(result){
        err = null;
        result.secret = submittedSecret;
        result.save();
        res.redirect('/secrets')
      }).catch(function(err){
        result = null;
        callback(err,result,false);
      });
})

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) { 
        console.log(err);
        res.redirect("/"); 
    }
    res.redirect('/');
  });
});
app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});
app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});
app.listen(3000, function() {
  console.log("Server started on port 3000.");
});

