const express = require ('express');
const app = express();
const { pool }= require("./dbConfig");
const bcrypt =  require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require ('passport');
const path = require('path');
const fs = require('fs');

const initializePassport = require("./passportConfig");

initializePassport(passport);
app.use(express.json());
let imagenIndex = 1;
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
app.get("/mazos", checkNotAuthenticated, (req, res)=>{
    res.render("mazos", {user: req.user.id_jugador});
});
app.get("/creador", checkNotAuthenticated, (req, res)=>{
  res.render("creador");
});
app.get("/mazoCreado", checkNotAuthenticated, (req, res)=>{
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



app.post('/mazos', async (req, res) => {
  const { nombre, tipo_mazo } = req.body;
  const id_jugador = req.user.id_jugador;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO mazo (nombre, tipo_mazo, id_jugador) VALUES ($1, $2, $3) RETURNING id_mazo', [nombre, tipo_mazo, id_jugador]);
    const mazoId = result.rows[0].id_mazo; // obtener el id del mazo insertado
    res.redirect(`/creador`);
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
//      // Leer la imagen en formato bytea desde la base de datos
//      const imagenBytea = result.rows[0].imagen;

//      // Convertir la imagen a base64
//      const imagenBase64 = Buffer.from(imagenBytea).toString('base64');
     
//      // Guardar la imagen como archivo temporal
//      fs.writeFileSync('temp.png', Buffer.from(imagenBytea), 'binary');
     
//      // Enviar la imagen en base64 a la página HTML
//      res.send({ imagen: `data:image/png;base64,${imagenBase64}` });
app.get('/visualizador', (req, res) => {
  const search = req.query.search || '';
  const tipo = req.query.tipo || '';
  const raza = req.query.raza || '';
  const coste = req.query.coste || 9999;
  const fuerza = req.query.fuerza || 0;

  pool.query(`SELECT * FROM carta
              WHERE nombre ILIKE '%${search}%'
              ${tipo ? `AND tipo = '${tipo}'` : ''}
              ${raza ? `AND raza = '${raza}'` : ''}
              AND coste <= ${coste}
              AND fuerza >= ${fuerza}
              ORDER BY nombre ASC
              LIMIT 5`, (error, results) => {
    if (error) {
      throw error;
    }
    res.render('visualizador', { user: req.user, cartas: results.rows, search: search, tipo: tipo, raza: raza, coste: coste, fuerza: fuerza });
  });
});

app.get('/carta/:codigo', (req, res) => {
  const codigo = req.params.codigo;

  pool.query('SELECT * FROM carta WHERE codigo = $1', [codigo], (error, result) => {
    if (error) {
      throw error;
    }
    if (result.rows.length === 0) {
      res.status(404).send('No se encontró la carta');
    } else {
      const carta = result.rows[0];
      const imagenPath = `/img/${imagenIndex.toString().padStart(3, '0')}.png`;
      imagenIndex++;

      res.render('carta', { user: req.user, carta: carta, imagenPath: imagenPath });
    }
  });
});