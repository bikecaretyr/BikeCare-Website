db = db.getSiblingDB('balaji_motors_bms');

db.createUser({
  user: 'bms_app',
  pwd: '765a34e2ca709b435f2a5347c7b8b7ec41244709b4ee7ec5d9fa957ea7b4b2c5',
  roles: [
    {
      role: 'readWrite',
      db: 'balaji_motors_bms'
    }
  ]
});