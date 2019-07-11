
//Getting the dependencies
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const port = 3000;
const moment = require('moment')

//file Upload middleware
app.use(fileUpload())

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


//Starting App (on localhost:3000)
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
app.get('/userCreateAcc/', function(req, res) {
    res.render('userCreateAcc')
});

//Rendering User Acc Page with errors
app.get('/userCreateAcc/noMatch/:field', function(req, res) {
    res.render('userCreateAcc', {
        field: req.params.field
    })
});

//Rendering Page if email already exists
app.get('/userCreateAcc/alreadyExist', function(req, res) {
    res.render('userCreateAcc', {
        exist: true
    })
});

//Rendering Shop Create Acc Page
app.get('/shopCreateAcc', function(req, res) {
    res.render('shopCreateAcc')
});


//Rendering the page when emails/password don't match
app.get('/shopCreateAcc/noMatch/:field', function(req, res) {
    res.render('shopCreateAcc', {
        field: req.params.field
    })
});

//Rendering the page when email or shop name already exist
app.get('/shopCreateAcc/alreadyExist/:resultType', function(req, res){
    res.render('shopCreateAcc', {
        resultType: req.params.resultType
    })
})


//Proccessing a Create User Acc Post Request
const User = require('./models/userModel')
app.post('/userCreateAcc', async function(req,res) {

    const data = req.body;
    //Searches if user with email already exists
    const userResult = await User.findOne({email: data.email})
    //Data validation
    if(data.email !== data.reEmail) {
        if(data.password !== data.rePassword) {
            //Tell user they need to have matching email and password
            return res.redirect('userCreateAcc/noMatch/email+password')
        }
    //Tell user they need to have matching email
    return res.redirect('userCreateAcc/noMatch/email')
    }
    else if(data.password !== data.rePassword) {
        return res.redirect('userCreateAcc/noMatch/password')
    }
    else if(userResult){
        return res.redirect('userCreateAcc/alreadyExist')
    }


    else {
    //Creating the User
    let user = new User();
    user.givenName = data.givenName;
    user.lastName = data.lastName;
    user.address = data.address;
    user.state = data.state;
    user.postcode = data.postcode;
    user.dob = data.dob;
    user.mobileNumber = data.mobileNumber;
    user.email = data.email;
    user.password = data.password;
    user.cart = {
        subtotal: 0,
        doc: NaN
    }

    //Adding user to db (an object id is generated by mongo)
    user.save(function(err) {
        if(err) {
            console.log(err)
        } else {
            //Log the user has been created and direct to sign in page
            console.log("User created ---> "+user.givenName+" "+user.lastName)
            res.redirect('/signin')
        }
        
    })


    }
});

//Proccessing a Create Shop Acc Post Request
const Shop = require('./models/shopModel')
app.post('/shopCreateAcc', async function(req,res) {


    //making req.body a single variable - ease of use
    const data = req.body

    //Searching for Shop with same name and storing in variable
    const shopNameResult = await Shop.findOne({name: data.name});
    //Searching for Shop with same email and storing in variable
    const shopEmailResult = await Shop.findOne({email: data.email})
    
    //Data Validation
    if(data.email !== data.reEmail) {
        if(data.password !== data.rePassword) {
            //Tell user they need to have matching email and password
            return res.redirect('shopCreateAcc/noMatch/email+password')
        }
    //Tell user they need to have matching email
    return res.redirect('shopCreateAcc/noMatch/email')
    }
    else if(data.password !== data.rePassword) {
        //Tell the user they need to have matching password
        return res.redirect('shopCreateAcc/noMatch/password')
    }
    else if (shopNameResult) {
        //Tell the user a shop with that name already exists
        return res.redirect('shopCreateAcc/alreadyExist/name')
    }
    else if (shopEmailResult) {
        //Tell the user a shop with that email already exists
        return res.redirect('shopCreateAcc/alreadyExist/email')
    }
    else {

    //Creating the User
    let shop = new Shop();

    //Adding the categories to the categories array.
    switch(Number(data.categoryCount)){
        case 1:
            shop.categories.push(data.category1)
            break;
        case 2:
            shop.categories.push(data.category1)
            shop.categories.push(data.category2)
            break;
        case 3:
            shop.categories.push(data.category1)
            shop.categories.push(data.category2)
            shop.categories.push(data.category3)
            break;
    }

    //Adding the fields to the shop object
    shop.name = data.name;
    shop.email = data.email;
    shop.password = data.password;
    shop.sales = {
        items_sold: 0,
        orders: 0,
        revenue: 0,
        profit: 0,
        item_ranks: [],
    }
    shop.inventory = [];
    shop.img = 'placeholderimage-icon.png';
    shop.status = 'deactive';
    shop.itemCategories = [];
    shop.manufacturers = [];
    shop.balance = 0;


    //Adding user to db (an object id is generated by mongo)
    shop.save(function(err) {
        if(err) {
            console.log(err)
            return;
        } else {
            console.log("Shop created ---> "+shop.name)
            res.redirect('/signin')
        }
        
    })
}
});

//Rendering Signin Page
app.get('/signin', function(req, res) {
    res.render('signin', {
        err: false,
    })
});

//Rendering Signin Page with err
app.get('/signin/err', function(req, res) {
    res.render('signin',{
        err: true,
    })
});

app.post('/signin', async function(req, res) {

    const data = req.body

    //Searches the shop db and the user db for a matching email + password
    const userResult = await User.findOne({ email: data.email, password: data.password }, '_id email password');
    const shopResult = await Shop.findOne({ email: data.email, password: data.password }, '_id email password');


    //If both dbs return nothing, then err
    if(!userResult && !shopResult) {
        return res.redirect('/signin/err');
      }
    
    //If db returns a user, send to user page
    if(userResult) {
        return res.redirect('/'+userResult._id + '/userhome')
      }
    
    //If db returns a shop, send to shop page
    if(shopResult) {
        return res.redirect('/'+shopResult._id + '/shophome')
      }

});

//Rendering the Shop home page (shop view)
app.get('/:id/shophome', async function(req, res) {

   
    //Setting the id as a variable
    const id = req.params.id
    //Searching for the shop and setting it as a variable
    const shop = await Shop.findById(id);

    //Sending the shop and the ammount of categories to pug
    res.render('shopHome', {
        shop: shop,
        categoryCount: shop.categories.length
    });
});


//Receiving Shop Page changes
app.post('/:id/shopEditAcc', async function(req, res) {

        //making req.body a single variable - ease of use
        const data = req.body

        //getting the shops id
        const shopId = req.params.id

        //getting the shop object
        const shop = await Shop.findOne({_id: shopId})

        //Searching for Shop with same name and storing in variable, 
        //thats not its current id. The $ne paramater makes sure
        //it isn't also searching for the current shops name.
        const shopNameResult = await Shop.findOne({name: data.name, _id: { $ne: shopId}});

        //Searching for Shop with same email and storing in variable.
        //Also applying the same $ne logic described above
        const shopEmailResult = await Shop.findOne({email: data.email, _id: { $ne: shopId}})

        //Data Validation

        if(data.email !== data.reEmail) {
            if(data.password !== data.rePassword) {
                //Tell user they need to have matching email and password
                return res.redirect('shopHome/noMatch/email+password')
            }
        //Tell user they need to have matching email
        return res.redirect('shopHome/noMatch/email')
        }
        else if(data.password !== data.rePassword) {
            //Tell the user they need to have matching password
            return res.redirect('shopHome/noMatch/password')
        }
        else if (shopNameResult) {
            //Tell the user a shop with that name already exists
            return res.redirect('shopHome/alreadyExist/name')
        }
        else if (shopEmailResult) {
            //Tell the user a shop with that email already exists
            return res.redirect('shopHome/alreadyExist/email')
        }
        //end of data validation

        else {

            
            //creating a new object for fields that are to be updated
            let updatedShop = {};

            //setting the fields
            updatedShop.email = data.email
            updatedShop.password = data.password
            updatedShop.name = data.name
            updatedShop.categories = []
            

            //Adding the categories on 
            switch(Number(data.categoryCount)){
                case 1:
                    updatedShop.categories.push(data.category1)
                    break;
                case 2:
                    updatedShop.categories.push(data.category1)
                    updatedShop.categories.push(data.category2)
                    break;
                case 3:
                    updatedShop.categories.push(data.category1)
                    updatedShop.categories.push(data.category2)
                    updatedShop.categories.push(data.category3)
                    break;
            }
            
            //Making sure there is an image to be saved
            if(!((req.files) == null)){
            //Saving the image
            let shopImg = req.files.imageFile
            //getting the extension of it
            const ext = getFileExt(shopImg.mimetype);
            shopImg.mv(path.join(__dirname,'public/photo-storage/'+ shop._id + 'logo' + '.' + ext), function(err){
                if(err) {
                    console.log(err)
                }
            })
            updatedShop.img = shop._id + 'logo' + '.' + ext
        }

            //Making the query for the update function
            const updateQuery = {_id: shopId}

            Shop.updateOne(updateQuery, updatedShop, async function(err) {
                if(err) {
                    console.log(err)
                }
                else {
                    console.log('Updated Shop --> id: '+shop._id)

                    //return to shop home, with updated results
                    return res.redirect('/'+shopId+'/shopHome'+'/updated')
                }
            })

        }
    
});


app.get('/:id/shopHome/:err/:code', async function(req, res) {
    //Setting the id as a variable
    const id = req.params.id
    //Searching for the shop and setting it as a variable
    const shop = await Shop.findById(id);
    //Setting err to the err sent in the url
    const err = req.params.err

    //The following if statements determine sending varying
    //variables to the Pug file, which renders the page
    //differently depending on the errs recieved
    if(err == 'noMatch'){
    res.render('shopHome', {
        shop: shop,
        categoryCount: shop.categories.length,
        field: req.params.code
    })
}
    if(err == 'alreadyExist') {
        res.render('shopHome', {
        shop: shop,
        categoryCount: shop.categories.length,
        resultType: req.params.code
        })
    }
})

//Rendering the page with a popup for update confirmation
app.get('/:id/shopHome/updated', async function(req, res) {
    //Setting the shop id as a variable
    const id = req.params.id

    //Searching for the shop and setting it as a variable 
    const shop = await Shop.findById(id)

    //Setting err to the err sent through the URL

    res.render('shopHome', {
        shop: shop,
        categoryCount: shop.categories.length,
        updated: true
    })

})


app.get('/logout', function(req, res) {
    res.redirect('/signin')
})


app.get('/:id/inventory', async function(req, res) {

        //Setting the shop id as a variable
        const id = req.params.id

        //Searching for the shop and setting it as a variable 
        const shop = await Shop.findById(id)

        //Getting the items
        const itemsFound = await Item.find({shopId: id})
        

    res.render('inventory', {
        shop: shop,
        items: itemsFound
    })
});



app.get('/:id/addItem', async function(req, res) {

     //Setting the shop id as a variable
     const id = req.params.id

     //Searching for the shop and setting it as a variable 
     const shop = await Shop.findById(id)
    res.render('addItem', {
        shop: shop
    })
})


//Getting item model
const Item = require('./models/itemModel')
app.post('/:id/addItem', async function(req, res) {

    const id = req.params.id
    const data = req.body

    let item = new Item();
    
    //Setting the shop id to the id sent through params
    item.shopId = id

    //Setting all the variables to their corresponding components
    item.name = data.name;
    item.category = data.category;
    item.manufacturer = data.manufacturer
    item.retail_price = data.retail_price;
    item.buy_price = data.buy_price;

    //Setting stock to the intial stock
    item.stock = data.initialStock;

    //Setting the intial stock date to today
    item.stock_date = Date(Date.now());

    item.minStock = data.minStock;
    item.eor = data.eor;

    item.desc = data.desc;

    
    //First checking a file was submitted
    if(!((req.files) == null)){
        //Saving the image
        let itemImg = req.files.imageFile
        //getting the extension of it
        const ext = getFileExt(itemImg.mimetype);

        //Moving the file to the photostorage folder
        //It is named as the items id and ending with itemImg + ext
        itemImg.mv(path.join(__dirname,'public/photo-storage/'+ item._id + 'itemImg' + '.' + ext), function(err){
            if(err) {
                console.log(err)
            }
        })
        //Setting the file name as a field in the item object
        item.img = item._id + 'itemImg' + '.' + ext
        
    }

    //Saving the item to the db
    item.save(function(err) {
        if(err) {
            console.log(err)
            return;
        } else {
            //Log the user has been created and direct to sign in page
            console.log("Item created ---> "+item.name+" id:"+item._id)
            res.redirect('/'+id+'/inventory')
        }
    
    })





    

});

//Route for when the shop wants to add a new category
app.get('/:id/editCats', async function(req, res) {

        //Setting the shop id as a variable
        const id = req.params.id

        //Searching for the shop and setting it as a variable 
        const shop = await Shop.findById(id)
        res.render('addCats', {
            shop: shop,
        })
});



app.post('/:id/editCats', async function(req, res) {

        //Setting the shop id as a variable
        const id = req.params.id

        //making the query 
        const updateQuery = {_id: id}

        //getting the shop
        const shop = await Shop.findById(id)

        updatedShop = {}

        updatedShop.itemCategories = shop.itemCategories

        //pushing the new category onto the array
        updatedShop.itemCategories.push(req.body.category)

        Shop.updateOne(updateQuery, updatedShop, async function(err) {
            if(err) {
                console.log(err)
            }
            else {
                console.log('Updated Shop Categories--> catName: '+req.body.category)
    
                //return to edit category page, with updated results
                return res.redirect('/'+id+'/editCats')
            }
        })
});


app.get('/:id/editCats/deletecategory/:index', async function(req, res) {
    
    //Doing the same as the above funciton, however, removing a manufacturer
    const id = req.params.id
    const catIndex = req.params.index
    const shop = await Shop.findById({_id: id})

    const updateQuery = {_id: id}

    updatedShop = {}

    updatedShop.itemCategories = shop.itemCategories
    
    //Removing the manufacturer out of the array
    updatedShop.itemCategories.splice(catIndex,1)

    Shop.updateOne(updateQuery, updatedShop, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Removed Item Category from Shop')

            //return to edit manufacturers page, with updated results
            return res.redirect('/'+id+'/editCats')
        }
    })
})


//Route for when the shop wants to add a new manufacturer
app.get('/:id/editManus', async function(req, res) {


    //Setting the shop id as a variable
    const id = req.params.id

     //Searching for the shop and setting it as a variable 
    const shop = await Shop.findById(id)

    res.render('addManus', {
        shop: shop,
    })
});

app.post('/:id/editManus', async function(req, res){
    const id = req.params.id

    //making a query
    const updateQuery = {_id: id}

    //getting the shop
    const shop = await Shop.findById(id)

    //making an empty object
    updatedShop = {}

    //Setting the manufacturers array to the current array stored in mongo
    updatedShop.manufacturers = shop.manufacturers
    //pushing the new manufacturer onto array
    updatedShop.manufacturers.push(req.body.manufacturer)

    Shop.updateOne(updateQuery, updatedShop, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Updated Shop Manufacturers--> id: '+id)

            //return to edit manufacturers page, with updated results
            return res.redirect('/'+id+'/editManus')
        }
    })
});

app.get('/:id/editManus/deletemanufacturer/:index', async function(req, res) {

    //Doing the same as the above funciton, however, removing a manufacturer

    const id = req.params.id
    const manuIndex = req.params.index
    const shop = await Shop.findById({_id: id})

    const updateQuery = {_id: id}

    updatedShop = {}

    updatedShop.manufacturers = shop.manufacturers
    
    //Removing the manufacturer out of the array
    updatedShop.manufacturers.splice(manuIndex,1)

    //Updating the object with the manufacturers array now without the deleted
    //manufacturer
    Shop.updateOne(updateQuery, updatedShop, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Removed Manufacturer from Shop')

            //return to edit manufacturers page, with updated results
            return res.redirect('/'+id+'/editManus')
        }
    })

});

//Removing an item page
app.get('/:id/inventory/:pageType', async function(req, res) {

    //Setting the shop id as a variable
    const id = req.params.id

    //Searching for the shop and setting it as a variable 
    const shop = await Shop.findById(id)

    //Getting the items
    const itemsFound = await Item.find({shopId: id})
     
    //Setting the page type from the params as a variable
    const pType = req.params.pageType

    console.log(pType);

    if(pType === 'removeItems') {
        res.render('inventory-removeItems', {
            shop: shop,
            items: itemsFound
        })
    }
    
});

//Delete an item route
app.get('/:itemId/removeItem', async function(req, res) {

    //setting item id to a variable 
    const itemId = req.params.itemId;

    //searching for the item and looking what shop its from, this is used to
    //load the page later. NOTE: the .shopId bit is because it returns the item id as well
    const shopId = await (await Item.findById({_id: itemId}, 'shopId')).shopId;

    //Deleting the item
    Item.findByIdAndDelete({_id: itemId}, async function(err){
        if(err) {
            console.log(err)
        }
        else {
            //if successful load the remove items page, the code that follows is
            //in the route above
            res.redirect('/'+shopId+'/inventory/removeItems')
        }
    })

});

//Edit an item route
app.get('/:id/editItem', async function(req, res) {

    //Setting the item id as the id data from params
    const itemId = req.params.id

    //Getting the item with corresponding id
    const item = await Item.findById(itemId)

    //Getting the shop id from the item object
    const shopId = item.shopId

    //Searching for the shop and setting it as a variable 
    const shop = await Shop.findById(shopId)

    res.render('editItem', {
        shop: shop,
        item: item
    })

});

app.post('/:id/editItem', async function(req, res) {

    //setting the item id as a variable
    const itemId = req.params.id

    //searches for an item with the id, and then returns the
    //shop id associated with it. 
    //For more info read this same procedure
    //in the get route for removing an item
    const shopId =  await (await Item.findById({_id: itemId}, 'shopId')).shopId;

    //making an empty item object to put all the fields in.
    let updatedItem = {}

    //setting all the data recieved to a simple variable called data
    const data = req.body

    //setting the fields
    updatedItem.name = data.name
    updatedItem.category = data.category
    updatedItem.manufacturer = data.manufacturer
    updatedItem.desc = data.desc
    updatedItem.retail_price = data.retail_price
    updatedItem.buy_price = data.buy_price
    updatedItem.eor = data.eor
    updatedItem.stock = data.stock
    updatedItem.minStock = data.minStock

    //updating the image (if there is one posted)
    if((req.files) != null) {
        
        //Saving the image 

        //making the image a variable
        let itemImg = req.files.imageFile

        //getting the extension of the image
        const ext = getFileExt(itemImg.mimetype)

        //saving it over the current image
        itemImg.mv(path.join(__dirname, 'public/photo-storage/'+ itemId + 'itemImg.'+ ext), function(err) {
            if (err) {
                console.log(err)
            }
        })   
    }
    
    //Updating the item in the database
    Item.updateOne({_id: itemId}, updatedItem, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Updated Item ---> id: '+itemId)

            //return to inventory page
            return res.redirect('/'+shopId+'/inventory')
        }
    })
});

app.get('/:id/findItems', async function(req, res) {

    //id of the shop
    const id = req.params.id

    //finding the shop
    const shop = await Shop.findById(id)

    //rendering find item page
    res.render('findItem', {
        shop: shop
    })
});

app.post('/:id/findItems', async function(req, res) {

    //id of the shop
    const id = req.params.id

    //finding the shop
    const shop = await Shop.findById(id)

    //Getting the data from the form and making conditions for the
    //search function
    const data = req.body
    let conditions = {}

    //Date stocked condition
    //if the date field isn't empty, then set it as a date object
    if(!(data.stock_date == '')){

        //Making a date object so we can compare in the search function
        conditions.stock_date = new Date(data.stock_date)
    }


    //Setting the stocked condition to either before or after,
    //depending on the field sent through from the client
    if(data.stocked == 'before'){
        conditions.stocked = 'before'
    }
    if(data.stocked == 'after'){
        conditions.stocked = 'after'
    }

    //First checks if the min and max are actually min and max

    if((Number(data.retail_price_min) <= Number(data.retail_price_max))){
        console.log('range has been set')
        //Setting the 'range' as an array when element 0 is the min and element 1 is the max
        conditions.retail_price_range = [data.retail_price_min, data.retail_price_max]
    }


    //Do the same as above
    if(Number(data.buy_price_min) <= Number(data.buy_price_max)){
        //Setting the 'range' as an array when element 0 is the min and element 1 is the max
        conditions.buy_price_range = [data.buy_price_min, data.buy_price_max]
    }


    //Do the same as above
    if(Number(data.stock_min) <= Number(data.stock_max)){
        //Setting the 'range' as an array when element 0 is the min and element 1 is the max
        conditions.stock_range = [data.stock_min, data.stock_max]
    }

    //Do the same as above
    if(Number(data.minStock_min) <= Number(data.minStock_max)){
        //Setting the 'range' as an array when element 0 is the min and element 1 is the max
        conditions.minStock_range = [data.minStock_min, data.minStock_max]
    }

    //Do the same as above
    if(Number(data.eor_min) <= Number(data.eor_max)){
        //Setting the 'range' as an array when element 0 is the min and element 1 is the max
        conditions.eor_range = [data.eor_min, data.eor_max]
    }

    console.log('CONDITIONS OBJECT')
    console.log(conditions)
    console.log(moment(conditions.stock_date).toDate())

    //Return all items in the shops inventory as an Array
    // const itemsFound = await Item.find({shopId: id})
    const itemsFound = await findItems()

    function findItems() {
        if((conditions.stocked == 'before') && (data.name != '') && (data.category != '') && (data.manufacturer != '') && (data.stock_date != '') && (conditions.retail_price_range != ['', '']) && (conditions.buy_price_range != ['', '']) && (conditions.stock_range != ['', '']) && (conditions.minStock_range != ['', ''])&& (conditions.eor_range != ['', ''])){
            return Item.find({
                shopId: id,
                name: data.name,
                category: data.category,
                manufacturer: data.manufacturer,

                //Here we query for 'Less than or equal to the date query'd since we are asking
                //for before
                stock_date: { $lte: conditions.stock_date}, 

                // Here we query for both greater than or equal too AND less than and equal to
                // this is so we can have a range. 
                // retail_price_range[0] is the min and [1] is the max
                // We do the same for all the other ranges
                retail_price: {$gte: conditions.retail_price_range[0],
                                $lte: conditions.retail_price_range[1]},
                buy_price: {$gte: conditions.buy_price_range[0],
                                $lte: conditions.buy_price_range[1]},
                stock: {$gte: conditions.buy_price_range[0],
                                    $lte: conditions.buy_price_range[1]},
                minStock: {$gte: conditions.minStock_range[0],
                                $lte: conditions.minStock_range[1]},
                eor: {$gte: conditions.eor_range[0],
                                    $lte: conditions.eor_range[1]}

            })
        }
    }   

    let itemCount
    if(itemsFound == undefined){
        itemCount = 0
    }
    else{
        itemCount = itemsFound.length
    }



    res.render('foundItems', {
        shop: shop,
        items: itemsFound,
        itemCount: itemCount
    })
});


//Restocking route
app.get('/:id/restockItems/:mode', async function(req, res){

    const id = req.params.id

    const shop = await Shop.findById(id)
    const mode = req.params.mode



    //Looks at what mode the page requested then performs said operations for the mode

    //RESTOCK OPTIONAL MODE
    if(mode == 'option') {
    const items = await Item.find({shopId: id})

    res.render('inventory-restockItems-manual', {
        shop: shop,
        items: items
    })
}

    //RESTOCK ALL
    if(mode == 'all') {

    const items = await Item.find({shopId: id})

    for(i=0; i < items.length; i++){

        let eor = items[i].eor;
        let stock = items[i].stock

        let updatedItem = {}
        updatedItem.stock = stock + eor;
        //Setting the date to now.
        updatedItem.stock_date = Date(Date.now());

        Item.updateOne({_id: items[i]._id}, updatedItem, function(err){
            if(err){
                console.log(err)
            }
        })
    }

    const updatedItems = await Item.find({shopId: id})

    res.render('inventory-restockItems-all', {
        shop: shop,
        items: updatedItems
    })
    }
});

//ADDING 1 STOCK TO THE ITEM MANUALLY
app.get('/:shopid/addStock/:itemid', async function(req, res){

    const shopId = req.params.shopid
    const itemId = req.params.itemid

    const item = await Item.findById(itemId)
    
    //adding 1 to the stock
    let stock = item.stock
    let updatedItem = {}
    updatedItem.stock = stock + 1;
    updatedItem.stock_date = Date(Date.now());


    const buyPrice = item.buy_price

    //Updating the item in the database
    Item.updateOne({_id: itemId}, updatedItem, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Stocked Item ---> id: '+itemId)

            //return to inventory page
            return res.redirect("/"+shopId+"/deductBalance/"+buyPrice)
        }
    })
});

//DEDUCTING 1 STOCK FROM THE ITEM MANUALLY
app.get('/:shopid/minusStock/:itemid', async function(req, res){

    const shopId = req.params.shopid
    const itemId = req.params.itemid

    const item = await Item.findById(itemId)
    
    //adding 1 to the stock
    let stock = item.stock
    let updatedItem = {}
    updatedItem.stock = stock - 1;
    updatedItem.stock_date = Date(Date.now());


    const buyPrice = item.buy_price

    //Updating the item in the database
    Item.updateOne({_id: itemId}, updatedItem, async function(err) {
        if(err) {
            console.log(err)
        }
        else {
            console.log('Stocked Item ---> id: '+itemId)

            //return to inventory page
            return res.redirect("/"+shopId+"/restockItems/option")
        }
    })
});

app.get("/:id/deductBalance/:ammount", async function(req, res){

    const id = req.params.id
    const ammount = req.params.ammount

    let updatedShop = {}
    let shop = await Shop.findById(id)
    let currentBal = shop.balance
    console.log(currentBal)

    updatedShop.balance = 10;
    console.log(updatedShop.balance)
    
    Shop.updateOne({id: id}, updatedShop, async function(err){
        if(err){
            console.log(err)
        }
        else{
            console.log('changed shop bal')
        }
    })

    return res.redirect("/"+id+"/restockItems/option")
})


app.post("/:id/inventory", async function(req, res){
    console.log(req.body)
})




//user home route
app.get('/:id/userhome', async function(req, res){

    const id = req.params.id
    const user = await User.findById(id)
    const shops = await Shop.find()

    res.render('userHome', {
        user: user,
        shops: shops
    })
})

//edit user profile route
app.get('/:id/userProfile', async function(req, res){

    const id  = req.params.id
    const user = await User.findById(id)

    res.render('userProfile', {
        user: user,
        moment: require('moment')
    })
})

app.post('/:id/editUserAcc', async function(req, res){

    const id = req.params.id
    const data = req.body

     //Searching for User with same email and storing in variable, 
     //thats not its current id. The $ne paramater makes sure
     //it isn't also searching for the current shops name.
    const userEmailResult = await User.findOne({email: data.email, _id: { $ne: id}});


    if(data.email !== data.reEmail) {
        if(data.password !== data.rePassword) {
            //Tell user they need to have matching email and password
            return res.redirect('userHome/noMatch/email+password')
        }
    //Tell user they need to have matching email
    return res.redirect('userHome/noMatch/email')
    }
    else if(data.password !== data.rePassword) {
        //Tell the user they need to have matching password
        return res.redirect('userHome/noMatch/password')
    }
    else if (userEmailResult) {
        //Tell the user a shop with that email already exists
        return res.redirect('userHome/alreadyExist/email')
    }

    //If all validation succeeds - THEN
    else {
        let updatedUser = {}

        updatedUser.givenName = data.givenName;
        updatedUser.lastName = data.lastName;
        updatedUser.address = data.address;
        updatedUser.state = data.state;
        updatedUser.postcode = data.postcode;
        updatedUser.dob = data.dob;
        updatedUser.email = data.email;
        updatedUser.mobileNumber = data.mobileNumber;

        User.updateOne({_id: id}, updatedUser, async function(err) {
            if(err){
                console.log(err)
            }
            else{
                console.log('User updated -----> id: '+id)
                return res.redirect('/'+id+'/userProfile')
            }
        })
    }
})


app.get('/:id/userHome/:err/:code', async function(req, res){

    const id = req.params.id

    const user = await User.findById(id)

    const err = req.params.err

    //The following if statements determine sending varying
    //variables to the Pug file, which renders the page
    //differently depending on the errs recieved
    if(err == 'noMatch') {
        res.render('userProfile', {
            user: user,
            field: req.params.code,
            moment: require('moment')
        })
    }
    if(err == 'alreadyExist'){
        res.render('userProfile', {
            user: user,
            exist: true,
            moment: require('moment')
        })
    }
})




app.get('/:id/deleteAcc', async function(req, res){

    const id = req.params.id

    User.findByIdAndDelete(id, function(){
        console.log('User id: '+id + " has been deleted")
    })

    res.redirect('/')
})


app.get('/:userID/shopPage/:shopID', async function(req, res){
    
    const userID = req.params.userID
    const shopID = req.params.shopID
    const user = await User.findById(userID)
    const shop = await Shop.findById(shopID)
    const items = await Item.find({shopId: shopID})

    res.render('shopPage', {
        shop: shop,
        user: user,
        items: items
    })
})


app.post('/:userID/addtoCart/:itemID/shop/:shopID', async function(req, res){

    const userID = req.params.userID
    const shopID = req.params.shopID
    const itemID = req.params.itemID
    const user = await User.findById(userID)
    const item = await Item.findById(itemID)
    const itemQTY = Number(req.body.qty)
    const shop = await Shop.findById(shopID)


    let updatedUser = {}
    updatedUser.cart = user.cart
    updatedUser.cart.subtotal = (user.cart.subtotal) + (item.retail_price * itemQTY)

    let cartItem = {
        name: item.name,
        price: item.retail_price,
        qty: itemQTY,
        img: item.img,
        shopName: shop.name,
    }
    if(updatedUser.cart[itemID]) {
       updatedUser.cart[itemID].qty = updatedUser.cart[itemID].qty + cartItem.qty
    }
    else{
        updatedUser.cart[itemID] = cartItem;
    }
    console.log(updatedUser)

    await User.updateOne({_id: userID}, updatedUser)

    return res.redirect('/'+userID+'/shopPage/'+shopID+'/addedtoCart/'+itemQTY+'/'+itemID)

})

app.get('/:userID/shopPage/:shopID/addedtoCart/:qty/:itemID', async function(req, res){
    
    const userID = req.params.userID
    const shopID = req.params.shopID
    const user = await User.findById(userID)
    const shop = await Shop.findById(shopID)
    const items = await Item.find({shopId: shopID})
    const item = await Item.findById(req.params.itemID)

    res.render('shopPage', {
        shop: shop,
        user: user,
        items: items,
        addedtoCart: true,
        itemAdded: item,
        qty: req.params.qty
    })
})




app.get('/:userid/cart/:shopid', async function(req, res){

    const id  = req.params.userid
    const oldUser = await User.findById(id)
    let items = [];
    const oldCart = oldUser.cart
    for(var key in oldCart){
        if((key != 'subtotal') && (key != 'doc')){
            items.push(oldCart[key])
        }
    }

    let subtotal = 0;
    for(var i in items){
        subtotal = subtotal + (items[i].price * items[i].qty)
        console.log(subtotal)
    }

    let updatedUser = {};
    updatedUser.cart = oldUser.cart;
    updatedUser.cart.subtotal = subtotal;
    await User.findByIdAndUpdate(id, updatedUser)

    const newUser = await User.findById(id)
    const cart = newUser.cart
    items = [];
    for(var key in cart){
        if((key != 'subtotal') && (key != 'doc')){
            items.push(cart[key])
        }
    }


    res.render('userCart', {
        user: newUser,
        cart: cart,
        items: items,
        shopid: req.params.shopid
    })
})














































function linearSearchItems(conditions) {
    
}


//Getting the date function 
/**
 * This function assembles the date a string in the format DD/MM/YYYY
 * it uses the javaScript Date() object to retrieve the current date
 * and formats ...
 */
function getDate() {
    let date = new Date(); 

    //Getting the day
    let d = date.getDate();

    //Getting the month
    let m = date.getMonth();

    //Getting the year
    let y = date.getFullYear();

    //THIS IS STRING MANIPULATION - Concatenating together string bits
    let DateString = d + '/' + m + '/' + y
    
    return DateString;
}

//THIS IS A STRING MANIPULATION FUNCTION TO GET THE FILE EXTENSION
/**
 * 
 * 
 */

function getFileExt(mimetype){

    const StringLength = mimetype.length;
    let CharacterIndex = 0;
    let extensionString = ''
    let lookingAtFileExt = false;

    while(CharacterIndex < StringLength){
        if(lookingAtFileExt == true){
             extensionString = extensionString + mimetype[CharacterIndex]
        }
        if(mimetype[CharacterIndex] == '/'){
            lookingAtFileExt = true;
        }
        CharacterIndex++;
    }

    return extensionString;
}




