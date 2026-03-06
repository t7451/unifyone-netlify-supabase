CREATE TABLE `document_embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`docId` varchar(100) NOT NULL,
	`docTitle` varchar(255) NOT NULL,
	`chunk` text NOT NULL,
	`chunkIndex` int NOT NULL,
	`embedding` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_embeddings_id` PRIMARY KEY(`id`)
);
