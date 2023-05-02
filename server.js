const express = require ('express');
const app = express();
const { pool }= require("./dbConfig");
const bcrypt =  require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require ('passport');
const path = require('path');


const initializePassport = require("./passportConfig");

initializePassport(passport);
app.use(express.json());

const PORT = process.env.PORT || 4000;
// aqui se declaran o se usan las extensiones
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}) );
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// rutas 

app.get("/registro", checkAuthenticated, (req, res)=>{
    res.render("registro");
});
app.get("/home", checkNotAuthenticated, (req, res)=>{
    res.render("home");
});
app.get("/login", checkAuthenticated, (req, res)=>{
    res.render("login");
});
app.get("", checkAuthenticated, (req, res)=>{
  res.render("login");
});
app.get("/logout",(req, res)=>{
    req.logOut(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
      });;
   
})
app.get("/mazos", checkAuthenticated, (req, res)=>{
    res.render("mazos");
});
app.get("/creador", checkAuthenticated, (req, res)=>{
  res.render("creador");
});
app.get("/mazoCreado", checkAuthenticated, (req, res)=>{
  res.render("mazoCreado");
});


app.get('/Jugador', (req, res)=>{
  pool.query("SELECT * FROM Jugador", (err,results) => {
  if(err){
    throw err;
  }
  res.status(200).json(results.rows
    )
 })
})

// esto sirve para obtener los datos del registro y pasarlos a la base de datos
app.post('/registro', async (req, res)=>{
    let { nombre, email, contrasena, contrasena2 }= req.body;

    console.log({
        nombre,
        email,
        contrasena,
        contrasena2,

    });
// en caso de error va mandar estos mensajes
    let errors = [];
    if (!nombre || !email || !contrasena || !contrasena2 ){
        errors.push({ message: "falta un campo"});
    }
    if (contrasena.length<6){
        errors.push({ message: "Contrasena debe ser mas larga"});
    }
    if (contrasena != contrasena2){
        errors.push({ message: "contrasenas diferentes"});
    }
    if (errors.length >0){
        res.render("registro", { errors });
    }else{
        //con la extension brcypt manda un encriptado de la base de datos de la contrasena
       let hashedPassword = await bcrypt.hash(contrasena, 10);   
       console.log(hashedPassword);

       pool.query(
        'SELECT * FROM Jugador WHERE email =$1 ', 
        [email], (err, results)=>{
            if (err){
                throw err
            }

           console.log(results.rows);

           if(results.rows.length > 0){
            errors.push({message: " El email ya esta registrado"});
            res.render('registro', {errors});
           } else {
            pool.query(
                'INSERT INTO Jugador (nombre, email, contrasena) VALUES ($1, $2, $3) RETURNING id_jugador, contrasena',
                [nombre, email, hashedPassword ],
                (err, results)=>{
                    if (err){
                        throw err;
                    }
                    console.log(results.rows);
                    req.flash("success_msg", "You are now registered. Please log in");
                    res.redirect("/login");
                }
            )    

           }; 
        }
       )
    };
});
app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
      failureFlash: true
    })
  );
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/home");
    }
    next();
  }
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/login");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
// OBTENER CARTAS 
app.get('/cartas-disponibles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carta');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las cartas disponibles' });
  }
});
// Ruta para crear un mazo nuevo
app.post('/crear-mazo', async (req, res) => {
  // Lógica para crear un nuevo mazo en la base de datos
});

// Ruta para obtener la lista de cartas de un mazo
app.get('/cartas-mazo/:id_Mazo', async (req, res) => {
  // Lógica para obtener la lista de cartas de un mazo en la base de datos
});

// Ruta para añadir una carta a un mazo
app.post('/anadir-carta-mazo/:id_Mazo/:id_Carta', async (req, res) => {
  // Lógica para añadir una carta a un mazo en la base de datos
});

// Ruta para quitar una carta de un mazo
app.post('/quitar-carta-mazo/:idMazo/:idCarta', async (req, res) => {
  // Lógica para quitar una carta de un mazo en la base de datos
});


app.post('/mazos', async (req, res) => {
  const { nombre, tipo } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO mazo (nombre, tipo_mazo) VALUES ($1, $2) RETURNING id_mazo', [nombre, tipo]);
    const mazoId = result.rows[0].id;
    res.redirect(`/mazos/${mazoId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el mazo');
  }
});
  function ul(index) {
	console.log('click!' + index)
	
	var underlines = document.querySelectorAll(".underline");

	for (var i = 0; i < underlines.length; i++) {
		underlines[i].style.transform = 'translate3d(' + index * 100 + '%,0,0)';
	}
}