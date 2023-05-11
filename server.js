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
const { error } = require('console');


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



app.post('/mazos', async (req, res) => {
  const { nombre, tipo_mazo } = req.body;
  const id_jugador = req.user.id_jugador;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO mazo (nombre, tipo_mazo, id_jugador) VALUES ($1, $2, $3) RETURNING id_mazo', [nombre, tipo_mazo, id_jugador]);
    const mazoId = result.rows[0].id_mazo; // obtener el id del mazo insertado
    req.flash('mensajeExito', '¡Mazo creado exitosamente!');
    res.redirect(`/constructorMazo/${mazoId}/${id_jugador}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el mazo');
  }
   
});

app.get('/constructorMazo/:mazoId/:id_jugador', async (req, res) => {
  const mazoId = req.params.mazoId;
  try {
    const cartas = await obtenerCartasMazo(mazoId);
    const mensajeExito = req.flash('mensajeExito')[0];
    res.render('constructorMazo', { cartas, mazoId, mensajeExito});
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los detalles del mazo');
  }
});

app.get('/mazos/:id', async (req, res) => {
  const id_mazo = req.params.id;
  try {
    const client = await pool.connect();
    const mazoResult = await client.query('SELECT * FROM mazo WHERE id_mazo = $1', [id_mazo]);
    const mazo = mazoResult.rows[0];
    const jugadorResult = await client.query('SELECT * FROM jugador WHERE id_jugador = $1', [mazo.id_jugador]);
    const jugador = jugadorResult.rows[0];
    const cartasResult = await client.query('SELECT * FROM carta WHERE id_mazo = $1', [id_mazo]);
    const cartas = cartasResult.rows;
    res.render('mazos', { mazo, jugador, cartas });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los detalles del mazo');
  }
});
  function ul(index) {
	console.log('click!' + index)
	
	var underlines = document.querySelectorAll(".underline");

	for (var i = 0; i < underlines.length; i++) {
		underlines[i].style.transform = 'translate3d(' + index * 100 + '%,0,0)';
	}
 }
 



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
      const imagenBytea = result.rows[0].imagen;
      const imagenBase64 = Buffer.from(imagenBytea).toString('base64');
      fs.writeFileSync('temp.png', Buffer.from(imagenBytea), 'binary');

      res.set('Content-Type', 'text/html');
      res.render('carta', { user: req.user, carta: carta, imagenBase64: imagenBase64 });
    }
  });
});
// AQUI SE ENLISTAN LOS MAZOS PROPIOS YA SEAN PUBLICOS O PRIVADOS
app.get('/lista_mazos', (req, res) => {
  const id_jugador = req.user.id_jugador;
  pool.query('SELECT * FROM mazo WHERE id_jugador = $1', [id_jugador], (error, result) => {
    if (error) {
      throw error;
    } else {
      const mazo = result.rows;
      res.render('lista_mazos', { mazo });
    }
  });
});
// AQUI SE DA LA OPCION PARA ELIMINAR EL MAZO CREADO DENTRO DEL LISTADO ANTERIOR 
app.post('/eliminar_mazo', (req, res) => {
  const id_mazo = req.body.id_mazo;
  pool.query('DELETE FROM mazo WHERE id_mazo = $1', [id_mazo], (error, result) => {
    if (error) {
      throw error;
    } else {
      res.redirect('/lista_mazos');
    }
  });
});

// OBTENER MAZOS PUBLICOS
app.get('/mazos_publicos', (req, res) => {

  pool.query('SELECT * FROM mazo WHERE tipo_mazo = 2', (error, result)=> {
    if (error){
      throw error;
    } else {
      const mazo = result.rows;
      res.render('mazos_publicos', { mazo });
    }
  });
});

// constructorMazo usa esta func
async function obtenerCartasMazo(idMazo) {
  try {
    const client = await pool.connect();
    const cartaMazoResult = await client.query('SELECT codigo_carta FROM carta_mazo WHERE id_mazo = $1', [idMazo]);
    const codigosCartas = cartaMazoResult.rows.map(row => row.codigo);

    const cartas = [];

    for (const codigoCarta of codigosCartas) {
      const cartaResult = await client.query('SELECT * FROM carta WHERE codigo_carta = $1', [codigoCarta]);
      const carta = cartaResult.rows[0];
      cartas.push(carta);
    }

    client.release();

    return cartas;
  } catch (err) {
    console.error(err);
    throw new Error('Error al obtener las cartas por mazo');
  }
};

// EDITOR DE MAZOS 
function agregarCarta(codigo, mazoId) {
  // Comprobar si la carta ya está en el mazo
  pool.query('SELECT * FROM Carta_Mazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo, mazoId], (error, result) => {
    if (error) {
      throw error;
    } else {
      // Si la carta ya está en el mazo, actualizar la cantidad
      if (result.rows.length > 0) {
        const cartaMazo = result.rows[0];
        if (cartaMazo.cantidad < 3) { // validacion cantidad maxima
          const nuevaCantidad = cartaMazo.cantidad + 1;
          pool.query('UPDATE Carta_Mazo SET cantidad = $1 WHERE codigo_carta = $2 AND id_mazo = $3', [nuevaCantidad, codigo, mazoId], (error, result) => {
            if (error) {
              throw error;
            } else {
              console.log(`Se ha actualizado la cantidad de la carta ${codigo} en el mazo ${mazoId}`);
            }
          });
        } else { 
          return 'cantidad maxima de esta carta en el mazo'
        }
      } else {
        // Si la carta no está en el mazo, agregar un nuevo registro
        pool.query('INSERT INTO Carta_Mazo (codigo_carta, id_mazo, cantidad) VALUES ($1, $2, $3)', [codigo, mazoId, 1], (error, result) => {
          if (error) {
            throw error;
          } else {
            console.log(`Se ha agregado la carta ${codigo} al mazo ${mazoId}`);
          }
        });
      }

    }
  });
};





//