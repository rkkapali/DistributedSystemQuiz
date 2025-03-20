CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);
INSERT INTO categories (name) VALUES ('Sport'), ('General Knowledge');
INSERT INTO questions (category_id, text) VALUES 
    (1, 'Who won the FIFA World Cup in 2018?'),
    (2, 'What is the capital of France?');
INSERT INTO answers (question_id, text, is_correct) VALUES
    (1, 'France', TRUE), (1, 'Brazil', FALSE), (1, 'Germany', FALSE), (1, 'Spain', FALSE),
    (2, 'Paris', TRUE), (2, 'London', FALSE), (2, 'Berlin', FALSE), (2, 'Madrid', FALSE);