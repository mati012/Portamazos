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

app.get("/mazoCreado", checkNotAuthenticated, (req, res)=>{
  res.render("mazoCreado");
});
app.get("/constructor", checkNotAuthenticated, (req, res)=>{
  res.render("constructor");
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


//CREADOR DE MAZO 
app.post('/mazos', async (req, res) => {
  const { nombre, tipo_mazo } = req.body;
  const id_jugador = req.user.id_jugador;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO mazo (nombre, tipo_mazo, id_jugador) VALUES ($1, $2, $3) RETURNING id_mazo', [nombre, tipo_mazo, id_jugador]);
    const mazoId = result.rows[0].id_mazo; // obtener el id del mazo insertado
    res.redirect(`/constructor`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el mazo');
  }
   
});


// BUSCADOR DE DE CARTAS 

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

// RESULTADO BUSQUEDA
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

// Agregar una carta a un mazo
function agregarCarta(codigo_carta, id_mazo) {
  console.log(`Agregando la carta ${codigo_carta} al mazo ${id_mazo}`);
  
  pool.query('SELECT * FROM CartaMazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo_carta, id_mazo], (error, result) => {
    if (error) {
      throw error;
    } else {
      console.log(`Resultados de la consulta SELECT: ${JSON.stringify(result.rows)}`);

      if (result.rows.length > 0) {
        const cartaMazo = result.rows[0];
        const nuevaCantidad = cartaMazo.cantidad + 1;
        console.log(`La carta ${codigo_carta} ya está en el mazo ${id_mazo}. Actualizando cantidad a ${nuevaCantidad}`);

        pool.query('UPDATE CartaMazo SET cantidad = $1 WHERE codigo_carta = $2 AND id_mazo = $3', [nuevaCantidad, codigo_carta, id_mazo], (error, result) => {
          if (error) {
            throw error;
          } else {
            console.log(`Se ha actualizado la cantidad de la carta ${codigo_carta} en el mazo ${id_mazo}`);
          }
        });
      } else {
        console.log(`La carta ${codigo_carta} no está en el mazo ${id_mazo}. Agregando nueva carta`);

        pool.query('INSERT INTO CartaMazo (codigo_carta, id_mazo, cantidad) VALUES ($1, $2, $3)', [codigo_carta, id_mazo, 1], (error, result) => {
          if (error) {
            throw error;
          } else {
            console.log(`Se ha agregado la carta ${codigo_carta} al mazo ${id_mazo}`);
          }
        });
      }
    }
  });
}
// Eliminar una carta de un mazo
function eliminarCarta(codigo_carta, id_mazo) {
  pool.query('DELETE FROM CartaMazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo_carta, id_mazo], (error, result) => {
    if (error) {
      throw error;
    } else {
      console.log(`Se ha eliminado la carta ${codigo_carta} del mazo ${id_mazo}`);
    }
  });
}

// Obtener las cartas de un mazo
function obtenerCartasMazo(id_mazo) {
  pool.query('SELECT * FROM CartaMazo JOIN Carta ON CartaMazo.codigo_carta = Carta.codigo WHERE id_mazo = $1', [id_mazo], (error, result) => {
    if (error) {
      throw error;
    } else {
      // Mostrar las cartas del mazo en una lista
      const cartasMazo = result.rows;
      let listaCartasMazo = "";
      cartasMazo.forEach((cartaMazo) => {
        listaCartasMazo += `<li>${cartaMazo.nombre} x${cartaMazo.cantidad} <button onclick="eliminarCarta('${cartaMazo.codigo_carta}', ${id_mazo})">Eliminar</button></li>`;
      });
      document.getElementById("cartas-mazo").innerHTML = listaCartasMazo;
    }
  });
}

