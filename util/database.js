const mongodb = require('mongodb');
const { MongoClient } = mongodb;
/** @type {mongodb.Db} */
let _db;

const mongoConnect = (callback) => {
  MongoClient.connect(process.env.DB_URL)
    .then(client => {
      console.log('DB connected!!!');
      _db = client.db();
      callback();
    })
    .catch(err => {
      console.log(err);
      throw err
    });
}

const getDb = () => {
  if (_db)
    return _db;
  throw 'No DB found !!'
};

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;


