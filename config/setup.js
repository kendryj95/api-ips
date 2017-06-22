const paypal = require('paypal-rest-sdk')

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'ASEtQs5zOnzaFM3jOo_cYlm7zD0It4D2x0K3NFUS0zgMaONtvt0amtSNf3l5thiGa-8NW7So7W1SbBJ6',
  'client_secret': 'ELJEkIvfiAorknhuzqsrsCwchUxLNUKdyW_F2yp2LcFfw5OET2CKkz455cZleC3SBfjtfDoqGJLqqF_x'
})

module.exports = paypal