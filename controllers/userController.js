//Following a different article
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/user")

//Now adding express validator to old code for maximum db security
const {validationResult, check, body} = require('express-validator')

//Now added decoding of html entities for easier database management
const Entities = require('html-entities').AllHtmlEntities
const entities = new Entities()

//Forgot pwd, essentials
const async = require('async')
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
require('dotenv').config()
sgMail.setApiKey(process.env.SENDGRID_API_KEY)


exports.sign_up_post = [
  //Validate and sanitize the fields
  check('email', 'Invalid email').isEmail().trim().escape().normalizeEmail(),
  check('username', 'Invalid username')
    .custom(value => !/&/.test(value)).withMessage('Usernames with & are not allowed')
    .trim()
    .escape(),
  check('password')
    .isLength({min:8}).withMessage('Password must be at least 8 characters')
    .custom(value => !/&/.test(value)).withMessage('Passwords with & are not allowed')
    .trim()
    .escape(),
  check('confirmPassword', 'Passwords do not match')
    .exists()
    .trim()
    .escape()
    .custom((value, {req}) => value===req.body.password),
  //process after validation and sanitization
  async (req, res, next) => {
    try {
      let {email, password, username} = req.body
  
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        console.log(errors)
        return res.status(400).json({ errors: errors.array()})
      } 
        //Check for existing user, test when user is saved
        await User.findOne({ email: email})
          .exec(function(err, found_email) {
            if (err) {return next(err)}
            if (found_email) {
              //This has to happen because of the way I handle errors on the frontend
              const errors = ([{msg: "An account with this email already exists"}])
              // console.log(errors)
              return res.status(400).json({errors: errors})
            }
          })
  
        //
        if (!username) {
          username = email
        }
  
        const dPassword = entities.decode(password)
        const passwordHash =  await bcrypt.hash(dPassword, 10)
        
        const newUser = new User({
          email: email.toLowerCase(),
          password: passwordHash,
          username,
        })
        const savedUser = await newUser.save()
        res.json(savedUser)
        return res.status(200).json({ msg: "Account created!"})
    } catch(err) {
      console.log(err)
      next(err)
    }
  }
]

//This is the article way, I would like to use express-validator here as well, I dont need to sanitize this
//since its not getting saved to the database so I think its okay to leave as is
exports.login_post = async (req, res) => {
  try {
    const {email, password} = req.body

    //validate and sanitize here
    if (!email || !password) {
      return res.status(400).json({ msg: "Not all the fields have been entered."})
    }

    const user = await User.findOne({ email: email})
    if (!user) {
      return res.status(400).json({ msg: "No account with this email has been registered."})
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials."})
    }

    const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET)
    //may need to remove this in production
    // console.log("token", token)
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message})
  }
}

exports.token_post = async (req, res) => {
  try {
    const token = req.header("x-auth-token")
    if (!token) {
      return res.json(flase)
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET)
    if (!verified) {
      return res.json(false)
    }

    const user = await User.findById(verified.id)
    if (!user) {
      return res.json(false)
    }

    return res.json(true)
  } catch (err) {
    res.status(500).json({ error: err.message})
  }
}

exports.forgot_pwd_post = function(req, res, next) {
  const {email} = req.body
  // console.log(`Forgotten email: ${email}`)
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex')
        // console.log("Crypto done")
        done(err, token)
      })
    },
    function(token, done) {
      User.findOne({ email: email}, function(err, user) {
        if (!user) {
          // console.log("Not a user")
          return res.status(400).json({ msg: "No account with this email has been registered."})
        }
        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000 //token expires in one hour
        user.save(function(err) {
          // console.log("Token made")
          done(err, token, user)
        })
      })
    }, function(token, user, done) {
      const msg = {
        to: user.email,
        from: "Simplecode4@gmail.com",
        subject: "Dacthulu Password Reset",
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        'https://dacthulu.herokuapp.com' + '/reset/' + token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      }
      sgMail
        .send(msg, function(err) {
          if (err) {
            console.log(err)
          } else {
            // console.log("email sent")
            done(err, 'done')
          }
        })
    }
  ], function(err) {
    if (err) return next(err)
    return res.status(200).send({ msg: `An e-mail with further instructions has been sent to `})
  })
}

exports.reset_pwd_get = async (req, res) => {
  try {
    let param = req.query.resetToken
    // console.log(param)
    User.findOne({ resetPasswordToken: param, resetPasswordExpires: { $gt: Date.now()}}, function(err, user) {
      if (!user) {
        return res.status(400).json({ msg: "It appears that your Password Reset Token is invalid or expired"})
      }
      return res.status(200).json({ msg: "Password reset token is valid"})

    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message})
  }
}

exports.reset_pwd_post = [
  //validate and sanitize the fields
  //process after validation and sanitization
  async (req, res, next) => {
    try {
      // console.log(req.body)
      await check('password')
        .isLength({min:8}).withMessage('Password must be at least 8 characters')
        .custom(value => !/&/.test(value)).withMessage('Passwords with & are not allowed')
        .trim()
        .escape()
        .run(req);
      await check('confirmPassword', 'Passwords do not match')
        .exists()
        .trim()
        .escape()
        .custom((value, {req}) => value===req.body.password)
        .run(req);
      // console.log(req.body.params.resetToken)
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        // console.log(errors)
        return res.status(400).json({errors: errors.array()})
      }
      //Check for exisiting user with resetToken
      let param = req.query.resetToken
      // console.log(param)
      User.findOne({ resetPasswordToken: param, resetPasswordExpires: { $gt: Date.now()}}, function(err, user) {
        if (!user) {
          console.log("Reset Token is invalid, will have to edit this")
          return res.status(400).json({ msg: "Password reset token is invalid or expired"})
        } else {
          if (err) {
            return next(err)
          }
          let dPassword = entities.decode(req.body.password)
            bcrypt.hash(dPassword, 10, (err, hashedPassword) => {
              if (err) {
                return next(err)
              } else {
                user.password = hashedPassword
                user.resetPasswordToken = undefined
                user.resetPasswordExpires = undefined
                user.save(function(err) {
                  // console.log("Password updated")
                  return res.status(200).json({ msg: "Password Updated!"})
                })
              }
            })
        }
      })
    } catch (err) {
      console.log(err)
      next(err)
    }
  }
]