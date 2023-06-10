const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_KEY)

const port = process.env.PORT || 5000



app.use(cors())
app.use(express.json())


const jwtVerify = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unathorization access' })
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SCRECT, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unathorization access' })
    }
    req.decoded = decoded;
    next()
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8efoi6h.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const instractorCollection = client.db("SportsAcademi").collection("instractor")
    const classCollection = client.db("SportsAcademi").collection("class")
    const enrollCollection = client.db("SportsAcademi").collection("allEnroll")
    const paymentCollection = client.db("SportsAcademi").collection("payment")

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SCRECT, {expiresIn: '1hr' })
    res.send({token})
    })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // get oparator
    app.get('/instractor', async (req, res) => {
      const result = await instractorCollection.find().toArray()
      res.send(result)
    })

    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray()
      return res.send(result)
    })

    app.get('/enroll', jwtVerify, async(req, res)=>{
      const email = req.query.email;
      // console.log(email)
      if(!email){
       return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: True, message: 'porviden access'})
      }
    
      const query = {email: email};
      // console.log(query)
      const result = await enrollCollection.find(query).toArray();
      res.send(result)
    })


    //  post mathod
    app.post('/all-enroll', async (req, res) => {
      const enroll = req.body;
      const result = await enrollCollection.insertOne(enroll);
      res.send(result)
    })


    app.post("/create-payment-intent", jwtVerify, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100) ;
      // console.log(price, amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    })
    
    
    app.post('/payments', async(req, res)=>{
      const payment = req.body;
      const insertResult= await paymentCollection.insertOne(payment)
    
      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await enrollCollection.deleteMany(query)
    
      res.send({result: insertResult, deleteResult});
    })
    


    // delete mathod

    app.delete('/enroll/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await enrollCollection.deleteOne(query)
      res.send(result)
    })



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('this is first side and assignment ')
})
app.listen(port, () => {
  console.log(`check at first side ${port}`)
})



