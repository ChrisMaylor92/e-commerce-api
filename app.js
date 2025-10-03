const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const port = 3001
const db = require('./queries')
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config()
const Pool = require('pg').Pool
const db_password = process.env.PASSWORD
const pool = new Pool({
    user: 'chris',
    host: 'localhost',
    database: 'ecommerce_db',
    password: db_password,
    port: 5432,
  })

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
}

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

const session = require('express-session');
app.use(session({
  secret: 'yourSecret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy((username, password, done) => {
    pool.query('SELECT * FROM users WHERE username = $1', [username], (error, results) => {
        const user = results.rows[0]
        if(!user){
            return done(null, false)
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if(err) {
                return done(err)
            }
            if(isMatch){
                return done(null, user)
            }else{
                return done(null, false)
            }
         })
      })
}))

passport.serializeUser((user, done) => { 
    return done(null, user.id)
})
passport.deserializeUser((id, done) => { 
    pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
        const user = results.rows[0]
        if (error) {
            return done(error);
          }
        if(!user){
            return done(null, false)
        }
        return done(null, user)
      })
 })

 app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
  });
  

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }))
app.get('/', (req, res) => {
    res.send('Login successful!');
  });
app.get('/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
      //says login successful, needs sorting!
    });
  });


  
app.get('/products', db.getProducts)
app.post('/products', db.createProduct)
app.get('/products/:id', db.getProductsById)
app.put('/products/:id', db.updateProductById)
app.delete('/products/:id', db.deleteProductById)

app.get('/users', db.getUsers)
app.post('/users', db.createUser)
app.get('/users/:id', db.getUserById)
app.put('/users/:id', ensureAuthenticated, db.updateUserById)


app.get('/carts', ensureAuthenticated, db.getUsersCart)
app.post('/carts', ensureAuthenticated, db.placeProductInCart )
app.delete('/carts/:product_id', ensureAuthenticated, db.removeProductFromCart)


app.post('/carts/checkout', ensureAuthenticated, db.checkoutCart)


app.get('/orders', db.getOrders)//unfinished
//get /orders/:id 
//get /users/orders (logged in)


app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})




