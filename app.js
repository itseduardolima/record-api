import express from 'express';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import multer from 'multer';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: 'Image/',
  filename: function (_req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notion Database API',
      version: '1.0.0',
      description: 'API for managing records in a Notion database',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        
      },
    ],
    components: {
      schemas: {
        Record: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Record ID',
            },
            company: {
              type: 'string',
              description: 'Company name',
            },
            campaign: {
              type: 'string',
              description: 'Campaign name',
            },
            content: {
              type: 'string',
              description: 'Campaign content',
            },
            description: {
              type: 'string',
              description: 'Campaign description',
            },
            plannedDate: {
              type: 'string',
              format: 'date',
              description: 'Planned date for the campaign',
            },
            where: {
              type: 'string',
              enum: ['Facebook', 'Linkedin'],
            },
            language: {
              type: 'string',
              description: 'Campaign language',
              enum: ['Portuguese', 'English'],
            },
            image: {
              type: 'string',
              format: 'binary',
              description: 'Campaign image file',
            },
            imageContent: {
              type: 'string',
              description: 'Description of the campaign image',
            },
          },
          required: ['id', 'company', 'campaign', 'content', 'description', 'plannedDate', 'where', 'language'],
        },
      },
    },
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/Image', express.static('Image'));

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

app.use(express.json());

/**
 * @swagger
 * /records:
 *   post:
 *     summary: Create a new record
 *     tags: [Records]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Record'
 *     responses:
 *       201:
 *         description: Record created successfully
 *       500:
 *         description: Server error
 */
app.post('/records', upload.single('image'), async (req, res) => {
  try {
    const { id, company, campaign, content, description, plannedDate, where, language, imageContent } = req.body;
    const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        ID: { number: parseInt(id) },
        Company: { title: [{ text: { content: company } }] },
        Campaign: { rich_text: [{ text: { content: campaign } }] },
        Content: { rich_text: [{ text: { content: content } }] },
        Description: { rich_text: [{ text: { content: description } }] },
        PlannedDate: { date: { start: plannedDate } },
        Where: { rich_text: [{ text: { content: where } }] },
        Language: { select: { name: language } },
        Image: { files: imageUrl ? [{ type: "external", name: "Campaign Image", external: { url: imageUrl } }] : [] },
        "image content": { rich_text: [{ text: { content: imageContent || '' } }] },
      }
    });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Get a record by ID
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Record ID
 *     responses:
 *       200:
 *         description: Record found
 *       500:
 *         description: Server error
 */
app.get('/records/:id', async (req, res) => {
  try {
    const response = await notion.pages.retrieve({ page_id: req.params.id });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /records/{id}:
 *   put:
 *     summary: Update a record by ID
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Record ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Record'
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       500:
 *         description: Server error
 */
app.put('/records/:id', upload.single('image'), async (req, res) => {
  try {
    const { id, company, campaign, content, description, plannedDate, where, language, imageContent } = req.body;
    const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    const response = await notion.pages.update({
      page_id: req.params.id,
      properties: {
        ID: { number: parseInt(id) },
        Company: { title: [{ text: { content: company } }] },
        Campaign: { rich_text: [{ text: { content: campaign } }] },
        Content: { rich_text: [{ text: { content: content } }] },
        Description: { rich_text: [{ text: { content: description } }] },
        PlannedDate: { date: { start: plannedDate } },
        Where: { rich_text: [{ text: { content: where } }] },
        Language: { select: { name: language } },
        Image: { files: imageUrl ? [{ type: "external", name: "Campaign Image", external: { url: imageUrl } }] : [] },
        "image content": { rich_text: [{ text: { content: imageContent || '' } }] },
      }
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     summary: Delete a record by ID
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Record ID
 *     responses:
 *       204:
 *         description: Record deleted successfully
 *       500:
 *         description: Server error
 */
app.delete('/records/:id', async (req, res) => {
  try {
    await notion.pages.update({
      page_id: req.params.id,
      archived: true
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/swagger`);
});