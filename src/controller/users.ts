/**
 * @info perform CRUD on user
 */
 import users, { IUser } from "../models/users";
 import Bcrypt from "../services/bcrypt";
 import mongoose from "mongoose";
 import Time from "../utils/Time";
 
 export default class CtrlUser {
     /**
      * creating a new user
      * @param body
      */
     static async create(body: any){
         //generating hashed password
         const hash = await Bcrypt.hashing(body.password);
         const data = {
             ...body,
             password: hash,
         };
         await users.create(data);
         return { success: true, message: "user created successfully" };
     }
 
     /**
      * authenticating a user
      * @param email
      * @param password
      */
     static async auth(email: string, password: string) {
         // fetch user from database
         const user = await users.findOne({ email }).lean();
 
         // if users exists or not
         if (user) {
             // verify the password
             const result = await Bcrypt.comparing(password, user.password);
 
             // if password is correct or not
             // if correct, return the user
             if (result) return user;
             // throw error
             else throw new Error("password doesn't match");
         }
         // throw error
         else throw new Error("user doesn't exists");
     }

     /**
      * displaying all users
      * @param page - the page number (starting from 0)
      * @param limit - no of documents to be returned per page
      */
     static async findAll(page: number, limit: number): Promise<IUser[]>{
        //skipping and limiting before showing entire users list
        return users
            .aggregate([
                {
                    $skip: page*limit,
                },
                {
                    $limit: limit,
                },
                {
                    $project: {
                        "password":0,
                        "__v": 0
                    }
                }

            ])
            .exec()
     }

     /**
      * find profile of user
      * @param userId 
      */
     static async userProfile(userId: string): Promise<IUser[]>{
        return users
            .aggregate([
                {
                    //matching userID with userId from users collection
                    $match: {
                        _id: new mongoose.Types.ObjectId(userId)
                    },
                },
                {
                    //ignoring password before displaying
                    $project:{
                        "password" : 0,
                        "__v":0
                    }  
                },
                {
                    //looking up from ticket collection with id as reference
                    $lookup: {
                        from: "tickets",
                        let: { userId: "$_id"},
                        pipeline: [
                            {
                                //matching userId from users with user Id in tickets collection and then 
                                //checking for valid showTime
                                $match: 
                                { 
                                    $expr: 
                                    {
                                        $and: 
                                        [ 
                                            {
                                                $eq: 
                                                [ "$user", "$$userId" ]
                                            }, 
                                            {
                                                $gt:
                                                ["$showTime", Time.current()]
                                            }
                                        ]
                                    }
                                }
                            },
                            //ignoring unnecessary fields before displaying
                            {
                                $project: {
                                    "user": 0,
                                    "__v":0
                                }
                            },
                            //looking up from movies and cinemas colection with id references 
                            {
                                $lookup: {
                                    from: "movies",
                                    localField: "movie",
                                    foreignField: "_id",
                                    pipeline: [
                                        {
                                            $project: {
                                                "__v":0
                                            } 
                                        }
                                    ],
                                    as: "movie"
                                }
                            },
                            {
                                $lookup: {
                                    from: "cinemas",
                                    localField: "cinema",
                                    foreignField: "_id",
                                    pipeline: [
                                        {
                                            $project: {
                                                "__v":0
                                            } 
                                        }
                                    ],
                                    as: "cinema"
                                }
                            },
                        ],
                        as: "tickets"
                    },
                },
                
            ])
            .exec();
     }
 }

 
 