const express = require('express');
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const initializePassport = require("./passportConfig");
const { error } = require('console');

initializePassport(passport);
app.use(express.json());
let imagenIndex = 1;
const PORT = process.env.PORT || 4000;
// aqui se declaran o se usan las extensiones
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// rutas 


app.get("/registroTienda", checkAuthenticated, (req, res) => {
  res.render("registroTienda");
});
app.get("/registro", checkAuthenticated, (req, res) => {
  res.render("registro");
});

app.get("/homeTienda", checkNotAuthenticated, (req, res) => {
  const mensajeExito = req.flash('mensajeExito')[0];
  res.render("homeTienda", {mensajeExito});
});
app.get("/login", checkAuthenticated, (req, res) => {
  res.render("login");
});
app.get("/loginTienda", checkAuthenticated, (req, res) => {
  res.render("loginTienda");
});
app.get("", checkAuthenticated, (req, res) => {
  res.render("login");
});
app.get("/logout", (req, res) => {
  req.logOut(function (err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });;

})

app.get("/mazos", checkNotAuthenticated, (req, res) => {
  res.render("mazos", { user: req.user.id_jugador });
});
app.get("/editorTienda", checkNotAuthenticated, (req, res) => {
  res.render("editorTienda", { user: req.user.id_tienda });
});

app.get("/mazoCreado", checkNotAuthenticated, (req, res) => {
  res.render("mazoCreado");
});
app.get("/constructor", checkNotAuthenticated, (req, res) => {
  res.render("constructor");
});


// esto sirve para obtener los datos del registro y pasarlos a la base de datos
app.post('/registro', async (req, res) => {
  let { nombre, email, contrasena, contrasena2 } = req.body;

  // console.log({
  //   nombre,
  //   email,
  //   contrasena,
  //   contrasena2,
  // });
  // en caso de error va mandar estos mensajes
  let errors = [];
  if (!nombre || !email || !contrasena || !contrasena2) {
    errors.push({ message: "falta un campo" });
  }
  if (contrasena.length < 6) {
    errors.push({ message: "Contrasena debe ser mas larga" });
  }
  if (contrasena != contrasena2) {
    errors.push({ message: "contrasenas diferentes" });
  }
  if (errors.length > 0) {
    res.render("registro", { errors });
  } else {
    //con la extension brcypt manda un encriptado de la base de datos de la contrasena
    let hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log(hashedPassword);

    pool.query(
      'SELECT * FROM Jugador WHERE email =$1 ',
      [email], (err, results) => {
        if (err) {
          throw err
        }

        // console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: " El email ya esta registrado" });
          res.render('registro', { errors });
        } else {
          pool.query(
            'INSERT INTO Jugador (nombre, email, contrasena) VALUES ($1, $2, $3) RETURNING id_jugador, contrasena',
            [nombre, email, hashedPassword],
            (err, results) => {
              if (err) {
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
app.post('/registroTienda', async (req, res) => {
  let { nombre, email, contrasena, contrasena2, direccion, pagina_web } = req.body;

  console.log({
    nombre,
    email,
    contrasena,
    contrasena2,
    direccion,
    pagina_web

  });
  // en caso de error va mandar estos mensajes
  let errors = [];
  if (!nombre || !email || !contrasena || !contrasena2 || !direccion || !pagina_web) {
    errors.push({ message: "falta un campo" });
  }
  if (contrasena.length < 6) {
    errors.push({ message: "Contrasena debe ser mas larga" });
  }
  if (contrasena != contrasena2) {
    errors.push({ message: "contrasenas diferentes" });
  }
  if (errors.length > 0) {
    res.render("registro", { errors });
  } else {
    //con la extension brcypt manda un encriptado de la base de datos de la contrasena
    let hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log(hashedPassword);

    pool.query(
      'SELECT * FROM tienda WHERE email =$1 ',
      [email], (err, results) => {
        if (err) {
          throw err
        }

        console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: " El email ya esta registrado" });
          res.render('registro', { errors });
        } else {
          pool.query(
            'INSERT INTO tienda (nombre, email, contrasena, direccion, pagina_web) VALUES ($1, $2, $3, $4, $5) RETURNING id_tienda, contrasena',
            [nombre, email, hashedPassword, direccion, pagina_web],
            (err, results) => {
              if (err) {
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
app.post("/loginJugador",
  passport.authenticate("jugadorStrategy", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true
  })
);
app.post("/loginTienda",
  passport.authenticate("tiendaStrategy", {
    successRedirect: "/homeTienda",
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
const ipAddress = '0.0.0.0';

app.listen(PORT, ipAddress, () => { // levantar la app
  console.log(`Server running on port ${PORT}`);
});
//CREADOR DE MAZO 
app.post('/mazos', async (req, res) => { // crear mazo
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

app.get('/constructorMazo/:mazoId/:id_jugador', async (req, res) => { // render constructor 
  const mazoId = req.params.mazoId;
  try {
    const cartas = await obtenerCartas();
    const cartasMazo = await obtenerCartasMazo(mazoId);
    const cantidades = await obtenerCantidadesCartasMazo(mazoId);
    const mensajeExito = req.flash('mensajeExito')[0];
    const mensajeError = req.flash('mensajeError')[0];
    const noCartas = [{
      "cartas": null
    }]
    // console.log('[GET constructorMazo] cartas mazo: ', cartasMazo);
    // console.log(cartas);
    res.render('constructorMazo', { cartas: noCartas, cartasMazo, mazoId, mensajeExito, cantidades, mensajeError });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los detalles del mazo');
  }
});

app.post('/agregarcarta', async (req, res) => { // agregar carta a mazo
  const { codigo_carta } = req.body;
  const mazoId = req.body.mazoId;
  console.log("agregarCarta: " + codigo_carta + " al mazo: " + mazoId);
  const id_jugador = req.user.id_jugador;
  try {
    const cartaAgregada = await agregarCarta(codigo_carta, mazoId);
    if (cartaAgregada) {
      req.flash('mensajeExito', '¡Carta agregada exitosamente!');
    } else {
      req.flash('mensajeError', 'No se puede agregar más de 3 copias de esta carta al mazo');
    }
    res.redirect(`/constructorMazo/${mazoId}/${id_jugador}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar la carta al mazo');
  }
});

app.post('/eliminarCarta', async (req, res) => { // eliminar carta de un mazo
  console.log('entro a eliminar carta');
  const { codigo_carta, mazoId } = req.body;
  const id_jugador = req.user.id_jugador;
  try {
    await eliminarCarta(codigo_carta, mazoId);
    req.flash('mensajeExito', '¡Carta eliminada exitosamente!');
    res.redirect(`/constructorMazo/${mazoId}/${id_jugador}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar la carta al mazo');
  }
});

app.get("/home", checkNotAuthenticated, async (req, res) => {
  const cartas = await obtenerCartas();
  const mensajeExito = req.flash('mensajeExito')[0];
  res.render("home", { cartas,mensajeExito });
});

app.get('/mazos/:id', async (req, res) => { // ver mazo sin editar 
  const mazoId = req.params.id;
  const id_jugador = req.user.id_jugador;

  try {
    const cartas = await obtenerCartas();
    const cartasMazo = await obtenerCartasMazo(mazoId);
    const cantidades = await obtenerCantidadesCartasMazo(mazoId);

    res.render('visualizadorMazo', { cartas, cartasMazo, mazoId, cantidades, id_jugador });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener datos de mazo y cartas');
  }
});

function ul(index) {
  console.log('click!' + index)

  var underlines = document.querySelectorAll(".underline");

  for (var i = 0; i < underlines.length; i++) {
    underlines[i].style.transform = 'translate3d(' + index * 100 + '%,0,0)';
  }
}

app.get('/visualizador', (req, res) => { // buscar cartas
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

app.get('/visualizadorParaMazo', async (req, res) => { // buscar cartas para agregar al mazo 
  const id_jugador = req.user.id_jugador;
  const mazoId = req.query.mazoId;
  const search = req.query.search || '';
  const tipo = req.query.tipo || '';
  const raza = req.query.raza || '';
  const coste = req.query.coste || 9999;
  const fuerza = req.query.fuerza || 0;
  const cartasMazo = await obtenerCartasMazo(mazoId);
  const cantidades = await obtenerCantidadesCartasMazo(mazoId);

  pool.query(`SELECT * FROM carta
              WHERE nombre ILIKE '%${search}%'
              ${tipo ? `AND tipo = '${tipo}'` : ''}
              ${raza ? `AND raza = '${raza}'` : ''}
              AND coste <= ${coste}
              AND fuerza >= ${fuerza}
              ORDER BY nombre ASC
              LIMIT 5`, (error, results) => {
    console.log("--------------------------------------------")
    console.log(results.rows);
    if (error) {
      throw error;
    }
    // res.render('constructorMazo', { mazoId, user: req.user, cartasMazo, mensajeExito: null, cartas: results.rows, search: search, tipo: tipo, raza: raza, coste: coste, fuerza: fuerza });
    res.render('constructorMazo', {
      mazoId,
      user: req.user,
      cartasMazo,
      mensajeExito: null,
      mensajeError: null,
      cartas: results.rows,
      search: search,
      tipo: tipo,
      raza: raza,
      coste: coste,
      fuerza: fuerza,
      cantidades
    });
  });
});

// vista carta 

app.get('/carta/:codigo', (req, res) => { // resultado busqueda, vista de cada carta 
  const codigo = req.params.codigo;

  pool.query('SELECT * FROM carta WHERE codigo = $1', [codigo], (error, result) => {
    if (error) {
      throw error;
    }
    if (result.rows.length === 0) {
      res.status(404).send('No se encontró la carta');
    } else {
      const carta = result.rows[0];

      // Obtener los productos que contienen "valhalla" en su nombre
      pool.query('SELECT * FROM producto WHERE nombre ILIKE $1  AND disponible = true', ['%valhalla%'], (error, result) => {
        if (error) {
          throw error;
        } else {
          const producto = result.rows;
          res.set('Content-Type', 'text/html');
          res.render('carta', { user: req.user, carta: carta, producto: producto });
        }
      });
    }
  });
});

// AQUI SE ENLISTAN LOS MAZOS PROPIOS YA SEAN PUBLICOS O PRIVADOS
app.get('/lista_mazos', checkNotAuthenticated, (req, res) => {
  const id_jugador = req.user.id_jugador;
  pool.query('SELECT * FROM mazo WHERE id_jugador = $1', [id_jugador], (error, result) => {
    if (error) {
      throw error;
    } else {
      const mazo = result.rows;
      res.render('lista_mazos', { mazo, id_jugador });
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

  pool.query('SELECT * FROM mazo WHERE tipo_mazo = 2', (error, result) => {
    if (error) {
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
    const codigosCartas = cartaMazoResult.rows.map(row => row.codigo_carta);
    // console.log(codigosCartas);
    const cartas = [];

    for (const codigoCarta of codigosCartas) {
      const cartaResult = await client.query('SELECT * FROM carta WHERE codigo = $1', [codigoCarta]);
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

async function obtenerCantidadesCartasMazo(idMazo) {
  try {
    const client = await pool.connect();
    const cartaMazoResult = await client.query('SELECT codigo_carta, cantidad FROM carta_mazo WHERE id_mazo = $1', [idMazo]);
    const cantidades = {};

    for (const row of cartaMazoResult.rows) {
      const { codigo_carta, cantidad } = row;
      cantidades[codigo_carta] = cantidad;
    }

    client.release();
    return cantidades;
  } catch (err) {
    console.error(err);
    throw new Error('Error al obtener las cantidades de cartas por mazo');
  }
}

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
async function agregarCarta(codigo_carta, mazoId) {
  // Comprobar si la carta ya está en el mazo
  console.log('codigo carta a agregar: ', codigo_carta);
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM carta_mazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo_carta, mazoId], (error, result) => {
      if (error) {
        reject(error);
      } else {
        if (result.rows.length > 0) {
          const cartaMazo = result.rows[0];
          const nuevaCantidad = cartaMazo.cantidad + 1;
          if (nuevaCantidad <= 3) {
            pool.query('UPDATE carta_mazo SET cantidad = $1 WHERE codigo_carta = $2 AND id_mazo = $3', [nuevaCantidad, codigo_carta, mazoId], (error, result) => {
              if (error) {
                reject(error);
              } else {
                console.log(`Mazo: ${mazoId}, Carta :${codigo_carta}, Nueva cantidad: ${nuevaCantidad} `);
                resolve(true);
              }
            });
          } else {
            console.log(`No se puede agregar más de 3 copias de la carta ${codigo_carta} al mazo ${mazoId}`);
            resolve(false);
          }
        } else {
          console.log(`La carta ${codigo_carta} no está en el mazo ${mazoId}. Agregando nueva carta`);

          pool.query('INSERT INTO carta_mazo (codigo_carta, id_mazo, cantidad) VALUES ($1, $2, $3)', [codigo_carta, mazoId, 1], (error, result) => {
            if (error) {
              reject(error);
            } else {
              console.log(`Se ha agregado la carta ${codigo_carta} al mazo ${mazoId}`);
              resolve(true);
            }
          });
        }
      }
    });
  });
}

// Eliminar una carta de un mazo
function eliminarCarta(codigo_carta, id_mazo) {
  // Consultar la cantidad de la carta en el mazo
  pool.query('SELECT cantidad FROM carta_mazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo_carta, id_mazo], (error, result) => {
    if (error) {
      throw error;
    } else {
      // Obtener la cantidad de la carta en el mazo
      const cantidad = result.rows[0].cantidad;

      if (cantidad > 1) {
        // Actualizar la cantidad de la carta en el mazo
        pool.query('UPDATE carta_mazo SET cantidad = $1 WHERE codigo_carta = $2 AND id_mazo = $3', [cantidad - 1, codigo_carta, id_mazo], (error, result) => {
          if (error) {
            throw error;
          } else {
            console.log(`Se ha actualizado la carta ${codigo_carta}(${cantidad})-1 = ${cantidad-1} en el mazo ${id_mazo}`);
          }
        });
      } else if (cantidad === 1) {
        // Eliminar la carta del mazo
        pool.query('DELETE FROM carta_mazo WHERE codigo_carta = $1 AND id_mazo = $2', [codigo_carta, id_mazo], (error, result) => {
          if (error) {
            throw error;
          } else {
            console.log(`Se ha eliminado la carta ${codigo_carta} del mazo ${id_mazo}`);
          }
        });
      } else {
        console.log(`La carta ${codigo_carta} no se encuentra en el mazo ${id_mazo}`);
      }
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
      //console.log(mazo);
      res.render('mazos_publicos', { mazo });
    }
  });
});
// Guardar un mazo que este publico que no pertenezca al usuario 
app.post('/guardar_mazo_publico', (req, res) => {
  const id_jugador = req.user.id_jugador;
  const id_mazo = req.body.id_mazo;

  pool.query('INSERT INTO Mazo (nombre, id_jugador, tipo_mazo) SELECT nombre, $1, 2 FROM Mazo WHERE id_mazo = $2 AND tipo_mazo = 2 AND id_jugador != $1 RETURNING id_mazo', [id_jugador, id_mazo], (error, result) => {
    if (error) {
      console.log(error);
      res.sendStatus(500);
    } else if (result.rows.length > 0) {
      console.log("----------mazo guardado");
      // console.log(result.rows);
      req.flash("success_msg", "Se ha guardado el mazo correctamente");
      res.redirect('/mazos_publicos');

    } else {
      req.flash("error_msg", "No se puede guardar el mazo");
      res.redirect('/mazos_publicos');
    }
  });
});
//CREADOR DE PRODUCTO
app.post('/creador_productos', async (req, res) => {
  const { nombre, precio, descripcion } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO producto (nombre, precio, descripcion, id_empresa, disponible) VALUES ($1, $2, $3, $4, $5) RETURNING id_producto', [nombre, precio, descripcion, 1, true]);
    const productoid = result.rows[0].id_producto; // obtener el id del producto insertado
    req.flash('mensajeExito', 'Producto creado exitosamente!'); // Mensaje de éxito
    res.redirect('/homeTienda');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el producto');
  }
});
// Ruta para mostrar los detalles del producto
app.get('/producto/:id', (req, res) => {
  const productoId = req.params.id;

  // Obtener los detalles del producto desde la tabla 'producto'
  pool.query('SELECT * FROM producto WHERE id_producto = $1', [productoId], (error, productoResult) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al obtener los detalles del producto');
      return;
    }

    const producto = productoResult.rows[0];

    if (!producto) {
      res.send('Producto no encontrado');
      return;
    }

    // Obtener todos los registros de 'producto_tienda' asociados al producto desde la tabla 'producto_tienda' y el nombre de la tienda correspondiente desde la tabla 'tienda'
    pool.query(
      'SELECT pt.hypervinculo, pt.precio_tienda, t.nombre FROM producto_tienda pt INNER JOIN tienda t ON pt.id_tienda = t.id_tienda WHERE pt.id_producto = $1  ORDER BY pt.precio_tienda ASC',
      [productoId],
      (error, productoTiendaResult) => {
        if (error) {
          console.error(error);
          res.status(500).send('Error al obtener los detalles del producto en la tienda');
          return;
        }

        const productoTiendas = productoTiendaResult.rows;
        res.render('producto', { producto: producto, productoTiendas: productoTiendas });
      }
    );
  });
});
// visualizador de productos 
app.get('/guiaProductos', (req, res) => {

  pool.query('SELECT * FROM producto WHERE disponible = true; ', (error, result) => {
    if (error) {
      throw error;
    } else {
      const producto = result.rows;
      res.render('guiaProductos', { producto });
    }
  });
});
// BUSCAR PRODUCTO
app.get('/buscar_producto', (req, res) => {
  const busqueda = req.query.busqueda;

  pool.query('SELECT * FROM producto WHERE nombre ILIKE $1  AND disponible = true', [`%${busqueda}%`], (error, result) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const productos = result.rows;
      res.render('guiaProductos', { producto: productos }); // El nombre de la variable en la vista debe ser 'producto' en lugar de 'productos'
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
// ACTUALIZAR LA DISPONIBILIDAD DE UN PRODUCTO ( ES DECIR SU CORRESPONDIENTE ELIMINACION )
app.post('/actualizar', (req, res) => {
  const id_producto = req.body.id_producto;
  const nuevoEstado = req.body.disponible === 'true' ? true : false; // Obtener el nuevo estado de disponibilidad del combobox

  // Actualizar la columna de disponibilidad en la tabla producto
  pool.query('UPDATE producto SET disponible = $1 WHERE id_producto =$2 ', [nuevoEstado, id_producto], (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al actualizar la disponibilidad');
    } else {
      res.redirect('/guiaProductos');
    }
  });
});
// PRODUCTOS TIENDA 
app.get('/productosTienda', (req, res) => {
  pool.query('SELECT * FROM producto WHERE disponible = true', (error, result) => {
    if (error) {
      throw error;
    } else {
      console.log(result); // Agrega esta línea para verificar los resultados en la consola
      const producto = result.rows;
      res.render('productosTienda', { producto });
    }
  });
});

app.get('/detalles_producto_tienda/:id', checkNotAuthenticated, async (req, res) => {
  const id_producto = req.params.id;
  const id_tienda = req.user.id_tienda;
  try {
    const client = await pool.connect();
    const productoTiendaQuery = 'SELECT * FROM producto_tienda WHERE id_producto = $1 AND id_tienda = $2';
    const productoQuery = 'SELECT * FROM producto WHERE id_producto = $1';
    
    const productoTiendaResult = await client.query(productoTiendaQuery, [id_producto, id_tienda]);
    const productoTienda = productoTiendaResult.rows[0];

    if (productoTienda) {
      const productoResult = await client.query(productoQuery, [id_producto]);
      const producto = productoResult.rows[0];

      res.render('detallesProductoTienda', { productoTienda: productoTienda, producto: producto });
    } else {
      res.redirect('/editorTienda/' + id_producto);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los detalles del producto en la tienda');
  }
});

app.get('/editorTienda/:id', checkNotAuthenticated, (req, res) => {
  const productoId = req.params.id;

  // Obtener los detalles del producto desde la base de datos utilizando el ID
  pool.query('SELECT * FROM producto WHERE id_producto = $1', [productoId], (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al obtener los detalles del producto');
    } else {
      const producto = result.rows[0];
      res.render('editorTienda', { producto: producto, user: req.user.id_tienda }); // Renderizar la vista de detalles del producto
    }
  });
});

app.post('/guardar_producto_tienda', async (req, res) => {
  const id_tienda = req.user.id_tienda;
  const id_producto = req.body.id_producto;
  const hypervinculo = req.body.hypervinculo;
  const precio_tienda = req.body.precio_tienda;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO producto_tienda (id_producto, id_tienda, id_edicion, hypervinculo, precio_tienda) VALUES ($1, $2, $3, $4, $5) RETURNING id_producto', [id_producto, id_tienda, 1, hypervinculo, precio_tienda]);
    const productoid = result.rows[0].id_producto; // obtener el id del producto insertado
    req.flash('mensajeExito', 'Producto guardado exitosamente!'); // Mensaje de éxito
    res.redirect('/homeTienda');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al guardar el producto en la tienda');
  }
});

app.post('/eliminar_producto_tienda', async (req, res) => {
  const id_tienda = req.user.id_tienda;
  const id_producto = req.body.id_producto;
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM producto_tienda WHERE id_producto = $1 AND id_tienda = $2', [id_producto, id_tienda]);
    req.flash('mensajeExito', 'Producto eliminado exitosamente!');
    res.redirect('/homeTienda');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar el producto');
  }
});

// AQUI EN ADELANTE SE CREA EL FORO Y SUS FUNCIONALIDADES

app.get('/crearPublicacion', checkNotAuthenticated, (req, res) => {
  const id_jugador = req.user.id_jugador;

  // Obtener todas las cartas desde la base de datos
  pool.query('SELECT codigo, nombre FROM carta', (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error al obtener las cartas');
    } else {
      const cartas = result.rows;

      // Obtener todas las publicaciones del usuario activo
      pool.query(
        'SELECT * FROM publicacion_foro WHERE id_jugador = $1 ORDER BY fecha_publicacion DESC',
        [id_jugador],
        (error, result) => {
          if (error) {
            console.error(error);
            res.status(500).send('Error al obtener las publicaciones del usuario');
          } else {
            const publicaciones = result.rows;
            res.render('crearPublicacion', { publicaciones, cartas });
          }
        }
      );
    }
  });
});

// Ruta para la página principal del foro (muestra todas las publicaciones)
app.get('/foro', (req, res) => {
  pool.query(
    'SELECT publicacion_foro.*, carta.imagen FROM publicacion_foro LEFT JOIN carta ON publicacion_foro.id_carta = carta.codigo ORDER BY publicacion_foro.fecha_publicacion DESC',
    (error, result) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al obtener las publicaciones del foro');
      } else {
        const publicaciones = result.rows.map(row => {
          return {
            id_publicacion: row.id_publicacion,
            titulo: row.titulo,
            contenido: row.contenido,
            fecha_publicacion: row.fecha_publicacion,
            carta: {
              imagen: row.imagen
            }
          };
        });
        res.render('foro', { publicaciones: publicaciones });
      }
    }
  );
});
// Ruta para ver una publicación específica y agregar comentarios
app.get('/foro/publicacion/:id', (req, res) => {
  const id_publicacion = req.params.id;
  pool.query(
    'SELECT p.*, c.nombre AS carta_nombre, c.imagen AS carta_imagen FROM publicacion_foro p INNER JOIN carta c ON p.id_carta = c.codigo WHERE p.id_publicacion = $1',
    [id_publicacion],
    (error, publicacionResult) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al obtener la publicación del foro');
        return;
      }

      const publicacion = publicacionResult.rows[0];

      if (!publicacion) {
        res.send('Publicación no encontrada');
        return;
      }

      pool.query(
        'SELECT c.*, j.nombre AS autor_nombre FROM comentario_foro c INNER JOIN jugador j ON c.id_jugador = j.id_jugador WHERE c.id_publicacion = $1 ORDER BY c.fecha_comentario ASC',
        [id_publicacion],
        (error, comentarioResult) => {
          if (error) {
            console.error(error);
            res.status(500).send('Error al obtener los comentarios de la publicación');
            return;
          }
      
          const comentarios = comentarioResult.rows;
          res.render('publicacion', { publicacion: publicacion, comentarios: comentarios });
        }
      );
    }
  );
});

// Ruta para procesar el formulario de creación de una nueva publicación
app.post('/foro/crear-publicacion', (req, res) => {
  const id_jugador = req.user.id_jugador;
  const { titulo, contenido, carta } = req.body; // Obtener el ID de la carta seleccionada
  const id_edicion = 1; // ID de la edición por defecto

  pool.query(
    'INSERT INTO publicacion_foro (id_jugador, id_carta, id_edicion, titulo, contenido) VALUES ($1, $2, $3, $4, $5)',
    [id_jugador, carta, id_edicion, titulo, contenido], // Usar el ID de la carta seleccionada
    (error) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al crear la nueva publicación');
      } else {
        res.redirect('/foro');
      }
    }
  );
});

app.post('/foro/publicacion/:id/comentarios', (req, res) => {
  const id_publicacion = req.params.id;
  const { contenido } = req.body;
  const id_jugador = req.user.id_jugador;

  pool.query(
    'INSERT INTO comentario_foro (id_publicacion, id_jugador, contenido, fecha_comentario) VALUES ($1, $2, $3, NOW())',
    [id_publicacion, id_jugador, contenido],
    (error) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al agregar el comentario');
      } else {
        res.redirect(`/foro/publicacion/${id_publicacion}`);
      }
    }
  );
});
app.post('/foro/publicacion/:id/eliminar', (req, res) => {
  const id_publicacion = req.params.id;

  pool.query(
    'DELETE FROM publicacion_foro WHERE id_publicacion = $1',
    [id_publicacion],
    (error) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al eliminar la publicación');
      } else {
        res.redirect('/crearPublicacion');
      }
    }
  );
});
app.get('/foro-busqueda', (req, res) => {
  const busqueda = req.query.search;

  pool.query('SELECT publicacion_foro.*, carta.imagen FROM publicacion_foro LEFT JOIN carta ON publicacion_foro.id_carta = carta.codigo WHERE publicacion_foro.titulo ILIKE $1', [`%${busqueda}%`], (error, result) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      const publicaciones = result.rows.map(row => {
        return {
          id_publicacion: row.id_publicacion,
          titulo: row.titulo,
          contenido: row.contenido,
          fecha_publicacion: row.fecha_publicacion,
          carta: {
            imagen: row.imagen
          }
        };
      });
      res.render('foro', { publicaciones: publicaciones });
    }
  });
});