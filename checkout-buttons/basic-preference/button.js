var MP = require ("mercadopago"), // requiero la libreria mercado pago..
    config = require ("../../config"); // requiero config para utilizar y pasar como parametro el client_id y client_secret
    
exports.run = function (req, res) {
    var mp = new MP (config.client_id, config.client_secret);
    
    var preference = {
           "items": [
            {
                "title": "Insignia payments Solu",
                "quantity": 1,
                "currency_id": "VEF", // Available currencies at: https://api.mercadopago.com/currencies
                "unit_price": 800.0
            },
            {
                "title": "Insignia payments",
                "quantity": 1,
                "currency_id": "VEF", // Available currencies at: https://api.mercadopago.com/currencies
                "unit_price": 700.0
            }
        ],


                    "payer": {   // info del comprador 
                    "name": "moises",
                    "surname": "marquina",
                    "email": "marquinaabreu@gmail.com",
                    "date_created": "2017-12-14T12:58:41.425-04:00",
                    "phone": {
                        "area_code": "+58",
                        "number": "4241766109"
                    },
                    "identification": {
                        "type": "CI-V", 
                        "number": "17038486"
                    },
                    "address": {
                        "street_name": "Street",
                        "street_number": 123,
                        "zip_code": "5700"
                    }
                             }, // cierre de datos del comprador

                        "back_urls": {
                        "success": "http://localhost/insignia/ips/index.php?r=site/index",
                        "failure": "http://localhost/insignia/ips/index.php?r=site/index",// cuando hay una falla o cuando clipkean en "volver a mi sitio"
                        "pending": "http://www.youtube.com"
                        },
                        "auto_return": "approved"
        };

    mp.createPreference(preference, function (err, data){
        
        if (err) {
            res.send (err);
        } else {
            res.render ("partials/mercadopago/mercadopago", {"preference": data});
        }
    });
};