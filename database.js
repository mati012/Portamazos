
const {Client} = require ('pg')

const client = new Client ({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "pokewhite99",
    database: "postgres"


})

client.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });

