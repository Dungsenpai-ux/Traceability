import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config({ silent: process.env.NODE_ENV === 'production' });

const URI = `mongodb+srv://dungmktb123:minhkhai123@cluster.jbj39nf.mongodb.net/SupplyChain?retryWrites=true&w=majority`;

const connectDB = async()=>{mongoose.connect(URI, { 
            useUnifiedTopology : true,
            useNewUrlParser : true
      })
    .then(() => console.log('MongoDB cluster connected...'))
    .catch(err => console.log(err))
};

export default connectDB;