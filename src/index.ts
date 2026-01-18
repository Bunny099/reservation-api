import express, { json } from "express";
import { prisma } from "../lib/db";
import cors from "cors";
import { Prisma } from "../src/generated/prisma/client";

const app = express();
app.use(cors());
app.use(json());

//room Post/
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
            return res.status(403).json({ message: "Failed at db creation!" });
        }
        return res.status(201).json({ response, message: "Success room created!" });
    } catch (e) {
        return res
            .status(500)
            .json({ message: "Server error while room creating!" });
    }
});
//room Get/ get by id only active onces
app.get("/rooms/:id", async (req, res) => {
    try {
        let capacity = 0;
        let available = 0;
        let reserved = 0;
        let today = new Date();
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Id field is missing!" });
        }
        let response = await prisma.room.findFirst({ where: { id } });
        if (!response) {
            return res.status(404).json({ message: "No Data Found!" });
        }
        let reservData = await prisma.reservation.findMany({
            where: { roomId: id },
        });
        reservData.forEach((e) => {
            if (e.status === "ACTIVE" && e.expiresAt > today) {
                reserved = reserved + 1;
            }
            return reserved;
        });
        if (reserved <= response.capacity) {
            available = response.capacity - reserved;
            capacity = response.capacity;
            return res
                .status(200)
                .json({
                    data: {
                        roomId: id,
                        available: available,
                        capacity: capacity,
                        reserved: reserved,
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
            return res.status(403).json({ message: "Db creation failed!" })
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
        if (response.length===0) {
            return res.status(200).json({ message: "No reservations found!" })
        }
        return res.status(200).json({ response, message: "Success Reservation found!" })

    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }
})

app.post("/reservation", async (req, res) => {
    try {
        let { roomId,userId } = req.body;
        let currentDay = new Date();
        let min = 5;
        let expiry = new Date(currentDay.getTime() + min * 60000);
        if (!roomId || !userId) {
            return res.status(400).json({ message: "Field is missing!" });
        }
        const result = await prisma.$transaction(
            async (tx) => {
                let count = 0;
                let today = new Date();
                let r = await tx.room.findFirst({ where: { id: roomId } });
                let c = await tx.reservation.findMany({ where: { roomId } });
                c.forEach((e) => {
                    if (e.status === "ACTIVE" && e.expiresAt > today) {
                        count = count + 1;
                    }
                    return count;
                });
                if (!r || r === null || r === undefined) {
                    return "ROOM_NOT_FOUND"

                }
                else if (count < r?.capacity!) {
                    await tx.reservation.create({
                        data: { roomId,userId, expiresAt: expiry },
                    });
                    return "BOOKED"

                }
                else if (count >= r?.capacity!) {
                    return "FULLED"

                }
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 10000,
            }
        );

        if (result === "ROOM_NOT_FOUND") {
            return res.status(404).json({ message: "Room Not Found!" })
        } else if (result === "BOOKED") {
            return res.status(200).json({ message: "Reservation Success!" })
        } else if (result === "FULLED") {
            return res.status(409).json({ message: "Room is fulled!" })
        }

    } catch (e) {
        return res.status(500).json({ message: "server error!" });
    }
});

app.delete("/reservation/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.header("X-Custom-Header");
        let response;
        if (!id) {
            return res.status(400).json({ message: "Field is missing!" });
        }
        let reserved = await prisma.reservation.findFirst({ where: { id } });

        if (!reserved) {
            return res.status(404).json({ message: "No reservations found!" });
        }
        if(reserved.userId !== userId){
            return res.status(400).json({message:"Not found!"})
        }
        if (reserved?.status === "ACTIVE") {
            response = await prisma.reservation.update({
                where: { id },
                data: { status: "CANCELLED" },
            });
        }
        if (reserved.status === "CANCELLED" || reserved.status === "EXPIRED") {
            return res.status(200).json({ message: "Success!" })
        }

        return res.status(200).json({ response, message: "Bookings cancelled!" });
    } catch (e) {
        return res.status(500).json({ message: "server error!" });
    }
});

app.listen(3000);
