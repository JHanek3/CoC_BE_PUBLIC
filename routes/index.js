var express = require('express');
var router = express.Router();
var user_controller = require('../controllers/userController')

//authentication middleware
const auth = require("../config/auth")

//cors pre-flight
var cors = require('cors')

/* GET home page. */
router.get("/", auth, async (req, res) => {
  const user = await user.findById(req.user)
  res.json({
    username: user.username,
    id: user._id
  })
  }
)

router.post('/register', user_controller.sign_up_post)

router.post('/login', user_controller.login_post)

router.post('/tokenIsValid', user_controller.token_post)

router.post('/forgot', user_controller.forgot_pwd_post)

router.get('/reset/:token', user_controller.reset_pwd_get)

router.post('/reset/:token', user_controller.reset_pwd_post)


module.exports = router;
