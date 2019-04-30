
//Getting the dependencies
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const port = 3000;


//Body Parser Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

//connect to db
mongoose.connect('mongodb://localhost:27017/uShop',{useNewUrlParser: true})
let db = mongoose.connection;
//check db connection 
db.once('open', function() {
    console.log('Connected to ' + db.name)
})
//check for db error
db.on('error', function(err) {
    console.log(err);
})


//Starting App (on localhost:3000/)
app.listen(port, function() {
    console.log('Server started on port ' + port);
});

//Setting the public directory
app.use(express.static('public'));

//Setting up view engine (Pug)
var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Rendering Home Page
app.get('/', function(req, res) {
    res.render('home');
});

//Rendering User Create Acc Page
app.get('/userCreateAcc', function(req, res) {
    res.render('userCreateAcc')
});

// //Proccessing a Create User Acc Post Request
const User = require('./models/userModel')
app.post('/userCreateAcc', function(req,res) {

    //Creating the User
    let user = new User();
    let data = req.body;
    user.givenName = data.givenName;
    user.lastName = data.lastName;
    user.address = data.address;
    user.state = data.state;
    user.postcode = data.postcode;
    user.dob = data.dob;
    user.mobileNumber = data.mobileNumber;
    user.email = data.email;
    user.password = data.password;

    //Adding user to db
    user.save(function(err) {
        if(err) {
            console.log(err)
            return;
        } else {
            res.redirect('/')
        }
        
    })
});
