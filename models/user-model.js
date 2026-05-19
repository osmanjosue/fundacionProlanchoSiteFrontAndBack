const {Schema, model}= require('mongoose');


const UserSchema=Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        default: 'USER_ROLE'
    },
});



 /* CODIGO DE FERNANDO HERRERA */
UserSchema.method('toJSON', function(){
    const { __v, password, ...object } = this.toObject();

    return object;
})

module.exports= model('User', UserSchema);

/* The permitted SchemaTypes are:

String
Number
Date
Buffer
Boolean
Mixed
ObjectId
Array
Decimal128
Map
UUID */