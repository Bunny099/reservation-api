import express, { json } from "express";
import { prisma } from "../lib/db"
import cors from "cors";

const app = express();
app.use(cors());
app.use(json());

//room Post/
app.post("/rooms", async (req, res) => {

    try {
        const { name, capacity } = req.body;
        if (!name || !capacity) {
            return res.status(400).json({ message: "All fields are required!" })
        }
        if (capacity <= 0) {
            return res.status(400).json({ message: "Invalid value!" })
        }
        let response = await prisma.room.create({
            data: {
                name, capacity
            }
        })
        if (!response) {
            return res.status(403).json({ message: "Failed at db creation!" })
        }
        return res.status(201).json({ response, message: "Success room created!" })
    } catch (e) {
        return res.status(500).json({ message: "Server error while room creating!" })
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
            return res.status(400).json({ message: "Id field is missing!" })
        }
        let response = await prisma.room.findFirst({ where: { id } });
        if (!response) {
            return res.status(404).json({ message: "No Data Found!" })
        }
        let reservData = await prisma.reservation.findMany({ where: { roomId: id } })
        reservData.forEach((e) => {
            if (e.status === "ACTIVE" && e.expiresAt > today) {
                reserved = reserved + 1
            }
            return reserved;
        })
        if (reserved <= response.capacity) {
            available = response.capacity - reserved;
            capacity = response.capacity;
            return res.status(202).json({ data: { roomId: id, available: available, capacity: capacity, reserved: reserved }, message: "room stats!" })
        }

    } catch (e) {
        return res.status(500).json({ message: "Server error!" })
    }
});




app.listen(3000);