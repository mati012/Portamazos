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
    const cartas = await obtenerCartas();
    const cartasMazo = await obtenerCartasMazo(mazoId);
    const mensajeExito = req.flash('mensajeExito')[0];
    console.log(cartas);
    res.render('constructorMazo', { cartas, cartasMazo, mazoId, mensajeExito});
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

// constructorMazo usa esta func
async function obtenerCartasMazo(idMazo) { //dejar solo obtener codigos de cartas, los valores de las cartas se obtendran en el get constructorMazo
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

async function obtenerCartas() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM CARTA');
    const cartas = result.rows
    client.release();

    return cartas;
  } catch (err) {
    console.log(err);
    throw new Error('Error al obtener cartas');
  }
};

// EDITOR DE MAZOS 
function agregarCarta(codigo, mazoId) {
  // Comprobar si la carta ya está en el mazo
  pool.query('SELECT * FROM Carta_Mazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo, mazoId], (error, result) => {
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
// BUSCAR MAZO PUBLICO
app.post('/buscar_mazo', (req, res) => {
  const busqueda = req.body.busqueda;

  pool.query('SELECT * FROM Mazo WHERE nombre ILIKE $1 AND tipo_mazo =2', [`%${busqueda}%`], (error, result) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const mazo = result.rows;
      res.render('mazos_publicos', { mazo });
    }
  });
});
// Guardar un mazo que este publico que no pertenezca al usuario 
app.post('/guardar_mazo_publico', (req, res) => {
  const id_jugador = req.user.id_jugador;

  pool.query('INSERT INTO Mazo (nombre, id_jugador, tipo_mazo) SELECT nombre, $1, 2 FROM Mazo WHERE id_mazo = $2 AND tipo_mazo = 2 AND id_jugador != $1 RETURNING id_mazo', [id_jugador, req.params.id_mazo], (error, result) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else if (result.rows.length > 0) {
      console.log(result.rows);
      req.flash("success_msg", "Se ha guardado el mazo correctamente");
      res.redirect('/mazos_publicos');
    } else {
      req.flash("error_msg", "No se puede guardar el mazo");
      res.redirect('/mazos_publicos');
    }
  });
});
//CREADOR DE PRODUCTO
app.post('/creador_productos', async (req,res) => {
  const {nombre, precio, descripcion}= req.body;
  try{
    const client = await pool.connect();
    const result = await client.query('INSERT INTO producto (nombre, precio, descripcion, id_empresa, disponible) VALUES ($1, $2, $3, $4, $5) RETURNING id_producto', [nombre, precio, descripcion, 1, true]);
    const productoid = result.rows[0].id_producto; // obtener el id del producto insertado
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el producto');
  }
});
// visualizador de productos 
app.get('/guiaProductos', (req, res) => {

  pool.query('SELECT * FROM producto WHERE disponible = true; ', (error, result)=> {
    if (error){
      throw error;
    } else {
      const producto = result.rows;
      res.render('guiaProductos', { producto });
    }
  });
});
// RENDERIZA Y OBTIENE LA PAGINA CREADOR PRODUCTO
app.get('/creadorProducto', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM producto WHERE id_empresa = $1', [1]); // Seleccionamos sólo los productos de la empresa con id 1
    const producto = result.rows;
    res.render('creadorProducto', { producto });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos');
  }
});
app.post('/actualizar', (req, res) => {
  const id_producto = req.body.id_producto;
  const nuevoEstado = req.body.disponible === 'true' ? true : false; // Obtener el nuevo estado de disponibilidad del combobox
  
  // Actualizar la columna de disponibilidad en la tabla producto
  pool.query('UPDATE producto SET disponible = $1 WHERE id_producto =$2 ', [nuevoEstado, id_producto], (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al actualizar la disponibilidad');
    } else {
      res.redirect('/creadorProducto');
    }
  });
});