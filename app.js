var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var cors = require("cors")

var indexRouter = require('./routes/index');
var testAPIRouter = require("./routes/testAPI")

var compression = require('compression')
var helmet = require('helmet')

var app = express();

app.use(helmet())

// view engine setup, not required anymore since react is frontend? EDIT OUT LATER
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

//dotenv
require('dotenv').config()

//Setup mongo connection
var mongoose = require('mongoose')
//dep vs. dev
var mongoDB = process.env.dev_db_url
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true,})
mongoose.set("useCreateIndex", true)
var db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection'))

app.use(compression())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use(cors(corsOptions))
//HEY STUPID IDIOT (REFERENCING ME)
//THE ORIGIN IS DACTHULU NOT DACTHULUAPI, you wouldnt have wasted an hr of debugging
//If you could read.
app.use(
  cors({
    origin: ["https://dacthulu.herokuapp.com", "http://localhost:3000"]
  })
)

app.options("*", cors())


app.use('/', indexRouter);
app.use("/testAPI", testAPIRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //not rendering, render errors on the front end
  // res.render('error');
});


//startering the server
const host = "0.0.0.0"
const port = process.env.PORT || 9000

app.listen(port, host, function() {
  console.log(`Server started on ${port}`)
})
module.exports = app;
