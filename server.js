const express = require ('express');
const app = express();


const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs"); 
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res)=>{
    res.render('login');
});

app.get("/registro", (req, res)=>{
    res.render("registro");
});

app.get("/login", (req, res)=>{
    res.render("login");
});

app.listen(PORT, () => {

})


