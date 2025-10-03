require('dotenv').config()
const bcrypt = require('bcrypt');
const Pool = require('pg').Pool
const password = process.env.PASSWORD
const pool = new Pool({
    user: 'chris',
    host: 'localhost',
    database: 'ecommerce_db',
    password: password,
    port: 5432,
  })



// Products 
const getProducts = (req, res) => {
    if(req.query.category){
        pool.query('SELECT * FROM products WHERE category = $1', [req.query.category], (error, results) => {
            if (error) {
              throw error
            }
            res.status(200).json(results.rows)
          })
    } else {
        pool.query('SELECT * FROM products', (error, results) => {
            if (error) {
              throw error
            }
            res.status(200).json(results.rows)
          })
    }
}
const getProductsById = (req, res) => {
    const id = parseInt(req.params.id)
  
    pool.query('SELECT * FROM products WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error
      }
      res.status(200).json(results.rows)
    })
}
const createProduct = (req, res) => {
    const { name, price, category, stock } = req.body
    pool.query('INSERT INTO products (name, price, category, stock) VALUES ($1, $2, $3, $4) RETURNING *', [name, price, category, stock], (error, results) => {
      if (error) {
        throw error
      }
      res.status(201).send(`${results.rows[0].name} added to products`)
    })
}

const updateProductById = (req, res) => {
    const id = parseInt(req.params.id)
    const {name, price, category, stock} = req.body
    pool.query(
      'UPDATE products SET name = $1, price = $2, category = $3, stock = $4 WHERE id = $5',
      [name, price, category, stock, id],
      (error, results) => {
        if (error) {
          throw error
        }
        res.status(200).send(`Product modified with ID: ${id}`)
      }
    )
  }


const deleteProductById = (req, res) => {
    const id = parseInt(req.params.id)
    pool.query('DELETE FROM products WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error
      }
      res.status(200).send(`Product deleted with ID: ${id}`)
    })
  }



//Users 
const getUsers = (req, res) => {
    pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
      if (error) {
        throw error
      }
      res.status(200).json(results.rows)
    })
}
const getUserById = (req, res) => {
    const id = parseInt(req.params.id)
  
    pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error
      }
      res.status(200).json(results.rows)
    })
}
const updateUserById = (req, res) => {
    const id = parseInt(req.params.id)
    const { username, email } = req.body
  
    pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3',
      [username, email, id],
      (error, results) => {
        if (error) {
          throw error
        }
        res.status(200).send(`User modified with ID: ${id}`)
      }
    )
  }
const createUser = (req, res) => {
    const { username, email, password } = req.body
    pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email], (error, results) => {
        if(error){
            throw error
        }
        if(results.rows.length > 0){
            return res.status(400).send("User already exists with this username or email")
        }
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedPassword], (error, results) => {
                if (error) {
                    throw error
                }
                const userId = results.rows[0].id;
                pool.query('INSERT INTO carts (total_price, user_id) VALUES ($1, $2 ) RETURNING user_id', [0, userId], (error, results) => {
                    if (error) {
                        pool.query('DELETE FROM users WHERE id = $1', [userId], () => {
                            res.status(500).send('Error creating cart, user rolled back');
                        });
                    } else {
                        res.status(201).send(`User added with id: ${results.rows[0].user_id}`)
                    }
                })
            })
        })
    })
}

//carts 
const getUsersCart = (req, res) => {
    const user_id = req.user.id
    pool.query('SELECT id FROM carts WHERE user_id = $1', [user_id], (error, results) => {
        if (error) {
          throw error
        }
        const cart_id = results.rows[0].id
        pool.query(
            `SELECT products.* 
             FROM carts_products 
             JOIN products ON carts_products.product_id = products.id 
             WHERE carts_products.cart_id = $1`,
            [cart_id],
            (error, results) => {
              if (error) {
                throw error;
              }
              res.status(200).json(results.rows);
            }
          );
          
    })
}
const placeProductInCart = (req, res) => {
    //check if that product is actually there
    const user_id = req.user.id
    const { product_id } = req.body
    pool.query('SELECT id FROM carts WHERE user_id = $1', [user_id], (error, results) => {
        if (error) {
          throw error
        }
        const cart_id = results.rows[0].id
        pool.query('INSERT INTO carts_products (cart_id, product_id) VALUES ($1, $2)', [cart_id, product_id], (error, results) => {
            if (error) {
                throw error
            }
            //need to say something better than just user 
            res.status(201).send(`User `)
        })
    })
}
const removeProductFromCart = (req, res) => {
    const user_id = req.user.id
    const product_id = parseInt(req.params.product_id)
    pool.query('SELECT id FROM carts WHERE user_id = $1', [user_id], (error, results) => {
        if (error) {
          throw error
        }
        const cart_id = results.rows[0].id
        //removes one instance 
        pool.query(
            `WITH del AS (
               SELECT ctid FROM carts_products
               WHERE cart_id = $1 AND product_id = $2
               LIMIT 1
             )
             DELETE FROM carts_products WHERE ctid IN (SELECT ctid FROM del);`,
            [cart_id, product_id],
            (error, results) => {
              if (error) {
                throw error;
              }
              if (results.rowCount === 0) {
                return res.status(404).send('No matching product found in cart');
              }
              res.status(200).send('Product removed from cart');
            }
          )
    })
}

const checkoutCart = (req, res) => {
    const user_id = req.user.id
    pool.query('SELECT id FROM carts WHERE user_id = $1', [user_id], (error, cartIdResults) => {
        if (error) {
          throw error
        }
        const cart_id = cartIdResults.rows[0].id
        pool.query('SELECT * FROM carts_products WHERE cart_id = $1', [cart_id], (error, cartProductsResults) => {
            if (error) {
              throw error
            }
            const cartProducts = cartProductsResults.rows
            if (cartProducts.length === 0) {
                return res.status(400).send('No products in cart');
            }
            pool.query(
                `SELECT SUM(products.price) AS total_price
                FROM carts_products
                JOIN products ON carts_products.product_id = products.id
                WHERE carts_products.cart_id = $1
                `, [cart_id], 
                (error, sumResults) => {
                if (error) {
                  throw error
                }
                const {total_price} = sumResults.rows[0]
                pool.query('INSERT INTO orders(total_items, total_price, date, user_id) VALUES ($1, $2, $3, $4) RETURNING id', [cartProducts.length, total_price, new Date(), user_id], (error, orderResults) => {
                    if (error) {
                      throw error
                    }
                    const order_id = orderResults.rows[0].id
                    let completed = 0;
                    //Loop through each product in the cart and insert into users_orders with the new order_id and each product_id.
                    cartProducts.forEach((item) => {
                        pool.query('INSERT INTO orders_products(order_id, product_id) VALUES ($1, $2)', [order_id, item.product_id], (error, results) => {
                            if (error) {
                              throw error
                            }
                            completed++
                            
                            if (completed === cartProducts.length) {
                                pool.query('DELETE FROM carts_products WHERE cart_id = $1', [cart_id], (error) => {
                                  if (error) throw error;
                                  res.status(200).send('Order placed successfully');
                                });
                              }
                              
                        })
                    })
                })
            })
            
        })
    })
}

//Orders

const getOrders = (req, res) => {
    //unfinished
    //returns all orders with products_ordered list attached to each [{ order_id, total_items, total_price, date, user_id, products_ordered: [{product_1}, {product_2} ]}, ....]
    pool.query('SELECT * FROM orders', (error, results) => {
        if (error) {
          throw error
        }
        res.status(200).json(results.rows)
    })   
}

const getOrdersById = (req, res) => {
    //UNFINISHED

    //returns order with products ordered list attached { order_id, total_items, total_price, date, user_id, products_ordered: [{product_1}, {product_2} ]}
    pool.query('SELECT * FROM orders', (error, results) => {
        if (error) {
          throw error
        }
        res.status(200).json(results.rows)
    })   
}


module.exports = {
    getProducts,
    createProduct,
    getProductsById,
    updateProductById,
    deleteProductById,
    getUsers,
    getUserById,
    updateUserById,
    createUser,
    getUsersCart,
    placeProductInCart,
    removeProductFromCart,
    checkoutCart,
    getOrders
  }