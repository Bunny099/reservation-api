import express, { json } from "express";
import { prisma } from "../lib/db";
import cors from "cors";
import { Prisma } from "../src/generated/prisma/client";

const app = express();
app.use(cors());
app.use(json());


app.post("/rooms", async (req, res) => {
    try {
        const { name, capacity } = req.body;
        if (!name || !capacity) {
            return res.status(400).json({ message: "All fields are required!" });
        }
        if (capacity <= 0) {
            return res.status(400).json({ message: "Invalid value!" });
        }
        let response = await prisma.room.create({
            data: {
                name,
                capacity,
            },
        });
        if (!response) {
            return res.status(500).json({ message: "Failed at db creation!" });
        }
        return res.status(201).json({ response, message: "Success room created!" });
    } catch (e) {
        return res
            .status(500)
            .json({ message: "Server error while room creating!" });
    }
});


app.get("/rooms/:id/availability", async (req, res) => {
    try {
        let capacity = 0;
        let available = 0;
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Id field is missing!" });
        }
        let response = await prisma.room.findFirst({ where: { id } });
        if (!response) {
            return res.status(404).json({ message: "No Data Found!" });
        }
        let count = await prisma.reservation.count({
            where: { roomId: id, status: "CONFIRM" },
        });

        if (count <= response.capacity) {
            available = response.capacity - count;
            capacity = response.capacity;
            return res
                .status(200)
                .json({
                    data: {
                        roomId: id,
                        available: available,
                        capacity: capacity,
                        reserved: count,
                    },
                    message: "room stats!",
                });
        }
    } catch (e) {
        return res.status(500).json({ message: "Server error!" });
    }
});

app.post("/user", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Field is missing!" })
        }
        let response = await prisma.user.create({ data: { name } });
        if (!response) {
            return res.status(500).json({ message: "Db creation failed!" })
        }
        return res.status(201).json({ response, message: "User created Success!" })
    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }

})
app.get("/users/:id/reservations", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Field is missing!" })
        }
        let response = await prisma.reservation.findMany({ where: { userId: id } });
        if (response.length === 0) {
            return res.status(200).json({ message: "No reservations found!" })
        }
        return res.status(200).json({ response, message: "Success Reservation found!" })

    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }
})

app.post("/reservation", async (req, res) => {
    try {
        let { roomId, userId } = req.body;
        let currentDay = new Date();
        let min = 10;
        let expiry = new Date(currentDay.getTime() + min * 60000);
        if (!roomId || !userId) {
            return res.status(400).json({ message: "Field is missing!" });
        }
        const result = await prisma.$transaction(
            async (tx) => {
                let r = await tx.room.findFirst({ where: { id: roomId } });
                let count = await tx.reservation.count({ where: { roomId, status: "CONFIRM" } });

                if (!r || r === null || r === undefined) {
                    return "ROOM_NOT_FOUND"

                }
                else if (count < r?.capacity!) {  
                    await tx.reservation.create({
                        data: { roomId, userId, status: "PENDING", expiresAt: expiry },
                    });
                    return "PENDING"

                }
                else if (count >= r?.capacity!) {
                    return "FULLED"

                }
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 10000,
                timeout: 10000,
            }
        );

        if (result === "ROOM_NOT_FOUND") {
            return res.status(404).json({ message: "Room Not Found!" })
        } else if (result === "PENDING") {
            return res.status(201).json({ message: "Reservation on hold!" })
        } else if (result === "FULLED") {
            return res.status(409).json({ message: "Room is fulled!" })
        }

    } catch (e) {
        return res.status(500).json({ message: "server error!" });
    }
});


app.post("/reservation/:id/confirm", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, roomId } = req.body;
        let today = new Date();
        let response;

        if (!id || !userId || !roomId) {
            return res.status(400).json({ message: "Field is missing!" })
        }
        let result = await prisma.$transaction(
            async (tx) => {
                let roomData = await tx.room.findFirst({ where: { id: roomId } });
                let count = await tx.reservation.count({ where: { roomId,status: "CONFIRM" } })
                let reservedData = await tx.reservation.findFirst({ where: { id } });
                if (reservedData?.userId !== userId) {
                    return "NOT_AUTHORIZE"
                }
                if (count >= roomData?.capacity! || reservedData?.expiresAt! < today) {
                    return "CANT_BOOK"
                }
                if(reservedData?.status==="CONFIRM"){
                    return "ALREADY_BOOK"
                }
                if (count < roomData?.capacity! && reservedData?.expiresAt! > today && reservedData?.status === "PENDING") {
                    response = await tx.reservation.update({ where: { id }, data: { status: "CONFIRM" } })
                    return "CONFIRM"
                }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 10000 }
        )
        if (result === "NOT_AUTHORIZE") {
            return res.status(403).json({ message: "Not authotize!" })
        } else if (result === "CANT_BOOK") {
            return res.status(400).json({ message: "Can't book!" })
        }else if(result === "ALREADY_BOOK"){
            return res.status(200).json({message:"Success!"})
        } else if (result === "CONFIRM") {
            return res.status(200).json({ response, message: "Booking confirm!" })
        }
    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }


})


app.post("/reservation/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.header("X-Custom-Header")
        let response;
        if (!id) {
            return res.status(400).json({ message: "Field is missing!" })
        }
        let reserved = await prisma.reservation.findFirst({ where: { id } });
        if (!reserved) {
            return res.status(404).json("No Reservation Exist!")
        }
        if (reserved?.userId !== userId) {
            return res.status(403).json({ message: "Not Authorize!" })
        }
        if (reserved.status === "CANCELLED") {
            return res.status(200).json({ message: "Success!" })
        }
        if (reserved.status === "CONFIRM") {
            response = await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } })
        }
        if (!response) {
            return res.status(400).json("Cancellation Failed!")
        }
        return res.status(200).json({ response, message: "Bookings Cancelled!" })
    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }

})

app.listen(3000);
