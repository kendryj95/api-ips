/*var MP = require ("mercadopago"), // requiero la libreria mercado pago..
    config = require ("../../config"); // requiero config para utilizar y pasar como parametro el client_id y client_secret

exports.run = function (req, res) {
    var mp = new MP (config.client_id, config.client_secret);


    var preference = {
            "items": [
                {
                    "title": "Insignia Payments Solutions.",
                    "quantity": 2,
                    "currency_id": "VEF",
                    "unit_price": 2000.0
                },
                {
                    "title": "Produ_Insi",
                    "quantity": 1,
                    "currency_id": "VEF",
                    "unit_price": 1500.0
                },
                {
                    "title": "Produ_Insignia_Me",
                    "quantity": 1,
                    "currency_id": "VEF",
                    "unit_price": 600.5
                },
                {
                    "title": "Produ_Insigniae",
                    "quantity": 4,
                    "currency_id": "VEF",
                    "unit_price": 1000.0
                }
            ],

            "back_urls": {
            "success": "http://localhost:3030/sales/success",
            "failure": "http://localhost/insignia/ips/index.php?r=site/index",// cuando hay una falla o cuando clipkean en "volver a mi sitio"
            "pending": "http://www.pending.com"
                        }
        };

    mp.createPreference (preference, function (err, data){
        if (err) {
            res.send (err);
        } else {
            res.render ("checkout-buttons/basic-preference/button", {"preference": data});
        }
    });
};
*/
