const { Client } = require('pg');

const config = {
  host: 'localhost',
  user: 'postgres',
  port: 5432,
  password: 'pokewhite99',
  database: 'postgres',
};

async function crearUsuario(nombre, correo, contraseña, tipoUsuario) {
    const client = new Client(config);
    await client.connect();
  
    const query = `INSERT INTO usuarios (nombre, correo, contraseña, tipoUsuario) VALUES ($1, $2, $3, $4) RETURNING *`;
  
    try {
      const result = await client.query(query, [nombre, correo, contraseña, tipoUsuario]);
      return result.rows[0];
    } catch (err) {
      console.log(err.stack);
    } finally {
      await client.end();
    }
  }


  async function obtenerUsuarios() {
    const client = new Client(config);
    await client.connect();
    
    const query = `SELECT * FROM usuarios`;
    
    try {
      const result = await client.query(query);
      return result.rows;
    } catch (err) {
      console.log(err.stack);
    } finally {
      await client.end();
    }
    }
  
async function actualizarUsuario(id, nombre, correo, contraseña, tipoUsuario) {
    const client = new Client(config);
    await client.connect();

    const query = `UPDATE usuarios SET nombre=$1, correo=$2, contraseña=$3, tipoUsuario=$4 WHERE id=$5 RETURNING *`;

    try {
        const result = await client.query(query, [nombre, correo, contraseña, tipoUsuario, id]);
        return result.rows[0];
    } catch (err) {
        console.log(err.stack);
    } finally {
        await client.end();
    }
}

async function eliminarUsuario(id) {
    const client = new Client(config);
    await client.connect();
    
    const query = `DELETE FROM usuarios WHERE id=$1`;
    
    try {
      await client.query(query, [id]);
      return true;
    } catch (err) {
      console.log(err.stack);
      return false;
    } finally {
      await client.end();
    }
    }

async function validarUsuario(correo, contraseña) {
    const client = new Client(config);
    await client.connect();
    
    const query = `SELECT * FROM usuarios WHERE correo = $1 AND contraseña = $2`;
    
    try {
      const result = await client.query(query, [correo, contraseña]);
      return result.rows[0];
    } catch (err) {
      console.log(err.stack);
    } finally {
      await client.end();
    }
    }

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    actualizarUsuario,
    eliminarUsuario,
    validarUsuario,
};