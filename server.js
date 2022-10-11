require('dotenv').config(); //we require this earliest in the file so that we can use it in the file to the earliest.
const express = require('express');
const ejs=require('ejs');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); // we dont need passport-local as this is required by passport-local-mongoose and it will use it .
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app=express();

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB");

const userSchema = new mongoose.Schema({
  email: String ,
  password: String,
  googleId: String,
  secret: String

})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
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

//********************************GET ROUTES********************************************

app.get("/", function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

    app.get("/login",function(req,res){
      res.render("login");

    })

    app.get("/register",function(req,res){
      res.render("register");

    })

    app.get("/secrets" , function(req,res){
      if(req.isAuthenticated()){
        User.find({secret: {$ne: null}} , function(err,foundUser){
          if(err)
          console.log(err);
          else{
            res.render("secrets" , {userWithSecret: foundUser})
          }
        })
      }
      else
      res.redirect("/login")
    })

    app.get("/logout", function(req,res){
      req.logout((err) =>{
        if(err)
        console.log(err);
      });
      res.redirect("/")
    })

    app.get("/submit",function(req,res){
      if(req.isAuthenticated()){
        //console.log(req);
        res.render("submit")
      }

      else
      res.redirect("/login")
    });

    //*****************************POST ROUTES**********************************

    app.post("/submit",async function(req,res){
      const subSecret = await req.body.secret; // passport sends in the info of user in req
    //console.log(req.user)
    //console.log(subSecret);
    const arr = Array.from(req);
    console.log(typeof(arr));
    console.log(req.user.id);
      User.findById(req.user.id , function(err,foundItem){ //ask senior about id error that it is not coming same
        if(err)
        console.log(err);
        else{
          if(foundItem){
            console.log(foundItem);
            foundItem.secret = subSecret
            foundItem.save(function(){
              res.redirect("/secrets")
            })
          }
        }
      })
    });

    app.post("/register",function(req,res){
    // in passport js username field is a must.
      User.register({username: req.body.username}, req.body.password , (err,user) =>{ // username is passed as javascript object and password is passed as normal string
        if(err){
          console.log(err);
          res.redirect("/register");
        }
        else{
          passport.authenticate("local")(req,res, () =>{  // this authenticates a user and creates a session for us . Now we will be able to go to secrets page till we close the browser as we have a cookie of the session with us .
            res.redirect("/secrets");
          });
        }
      });

    });

    app.post('/login',
      passport.authenticate('local', { failureRedirect: '/login' }),
      function(req, res) {
        res.redirect('/secrets');
      });

      app.listen(3000 , function(){
        console.log("Server started at port 3000");
      });
