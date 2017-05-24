var paypal = require('paypal-rest-sdk')

//AYdVxAu3gwaTAcv4qU07-KjHNGS8EnwUEJL0IUxZFz1KWmKZMLeuppa18ddkfq7ZMgigwqVm4_BJOnM5
//ENMzt1C9Qhb7id1w25LFmNyAXluIphATeXSuNRJCtV5aiHa4-KQ_IFPNE3RmeFgTe3Z7B_F0QkI1ECwP

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'ASEtQs5zOnzaFM3jOo_cYlm7zD0It4D2x0K3NFUS0zgMaONtvt0amtSNf3l5thiGa-8NW7So7W1SbBJ6',
  'client_secret': 'ELJEkIvfiAorknhuzqsrsCwchUxLNUKdyW_F2yp2LcFfw5OET2CKkz455cZleC3SBfjtfDoqGJLqqF_x',
//  'headers': {
//		'custom': 'header'
//	}
})