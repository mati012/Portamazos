const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");


function initialize(passport) {
  console.log("Init passaport");

  const authenticateUser = (email, password, done) => {
    // console.log(email, password);
    pool.query(
      `SELECT * FROM Jugador WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        // console.log(results.rows);

        if (results.rows.length > 0) {
          const user = results.rows[0];

          bcrypt.compare(password, user.contrasena, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              return done(null, user);
            } else {
              // Password is incorrect
              return done(null, false, { message: "Clave erronea" });
            }
          });
        } else {
          return done(null, false, {
            message: "No hay usuario con ese email"
          });
        }
      }
    );
  };

  const authenticateTienda = (email, password, done) => {
    console.log(email, password);
    pool.query(
      `SELECT * FROM Tienda WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          const tienda = results.rows[0];

          bcrypt.compare(password, tienda.contrasena, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              return done(null, tienda);
            } else {
              // Password is incorrect
              return done(null, false, { message: "Contraseña incorrecta" });
            }
          });
        } else {
          return done(null, false, {
            message: "No hay una tienda registrada con ese email"
          });
        }
      }
    );
  };

  passport.use(
    "jugadorStrategy",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );

  passport.use(
    "tiendaStrategy",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateTienda
    )
  );

  passport.serializeUser((user, done) => {
    const serializedUser = {
      id: user.id_jugador || user.id_tienda,
      type: user.id_jugador ? "jugador" : "tienda"
    };
    done(null, serializedUser);
  });
  
  passport.deserializeUser((user, done) => {
    if (user.type === "jugador") {
      pool.query(
        `SELECT * FROM Jugador WHERE id_jugador = $1`,
        [user.id],
        (err, results) => {
          if (err) {
            return done(err);
          }
          // console.log(`ID is ${results.rows[0].id_jugador}`);
          return done(null, results.rows[0]);
        }
      );
    } else if (user.type === "tienda") {
      pool.query(
        `SELECT * FROM Tienda WHERE id_tienda = $1`,
        [user.id],
        (err, results) => {
          if (err) {
            return done(err);
          }
          console.log(`ID is ${results.rows[0].id_tienda}`);
          return done(null, results.rows[0]);s
        }
      );
    } else {
      return done(new Error("Invalid user type"));
    }
  });
}

module.exports = initialize;