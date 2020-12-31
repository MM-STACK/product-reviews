import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();
app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        // console.log(req.originalUrl)
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db('product-reviews');

        await operations(db);
        client.close();

    } catch (error) {
        // console.log(error);
        res.status(500).json({ message: 'Error connecting to db', error });
    }
}

app.get('/api/products/:id', async (req, res) => {
    withDB(async (db) => {
        const productId = req.params.id;
        const productInfo = await db.collection('products').findOne({ id: productId });
        res.status(200).json(productInfo);
    }, res);
})

app.post('/api/products/:id/vote', async (req, res) => {
    withDB(async (db) => {
        const productId = req.params.id;
        const { vote } = req.body;
        let updatedproductInfo={};

        const productInfo = await db.collection('products').findOne({ id: productId });                                     
       if (productInfo !== null) {
           await db.collection('products').updateOne(
               { id: productId },
               {
                   '$set': {
                       thumbsUp: productInfo.thumbsUp + (vote === 'up' ? 1 : 0),
                       thumbsDown: productInfo.thumbsDown + (vote === 'down' ? 1 : 0)
                   },
               });        
           updatedproductInfo = await db.collection('products').findOne({ id: productId });
       } else {
           updatedproductInfo={
               id: productId,
               thumbsUp: (vote === 'up' ? 1 : 0),
               thumbsDown: (vote === 'down' ? 1 : 0),
               comments: []
           }
        //    console.log(updatedproductInfo);
           await db.collection('products').insertOne(updatedproductInfo);           
       }       
       res.status(200).json(updatedproductInfo);
    }, res);
});

app.post('/api/products/:id/add-comment', (req, res) => {    
    withDB(async (db) => {                
        const { username, text } = req.body;
        const productId = req.params.id;    
        let updatedproductInfo={};

        const productInfo = await db.collection('products').findOne({ id: productId });
        if (productInfo !== null) {
            console.log('found..')
            await db.collection('products').updateOne({ id: productId }, {
                '$set': {
                    comments: productInfo.comments.concat({ username, text }),
                },
            });

            updatedproductInfo = await db.collection('products').findOne({ id: productId }); 
        } else {
            console.log('not found..')
            updatedproductInfo = {
                id: productId,
                thumbsUp: 0,
                thumbsDown: 0,
                comments: [{ username, text }]
            }
            
            await db.collection('products').insertOne(updatedproductInfo);    
        }                    

        res.status(200).json(updatedproductInfo);

    },  res);    
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => console.log('Listening on port 8000'));