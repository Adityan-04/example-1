from transformers import pipeline
from sentence_transformers import SentenceTransformer
import spacy
import torch
import os

class AIService:
    def __init__(self):
        # Initialize models
        self.summarizer = pipeline('summarization', model='facebook/bart-large-cnn')
        self.qa_model = pipeline('question-answering', model='deepset/roberta-base-squad2')
        self.ner_model = spacy.load('en_core_web_sm')
        self.sentiment_model = pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english')
        self.text_classifier = pipeline('text-classification', model='distilbert-base-uncased')
        
        # Use GPU if available
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    def analyze_document(self, document, analysis_type='general'):
        """Analyze document content based on specified analysis type."""
        if not document.content:
            return {'error': 'Document content not available'}
            
        try:
            if analysis_type == 'general':
                return self._general_analysis(document.content)
            elif analysis_type == 'sentiment':
                return self._sentiment_analysis(document.content)
            elif analysis_type == 'entities':
                return self._entity_analysis(document.content)
            elif analysis_type == 'topics':
                return self._topic_analysis(document.content)
            else:
                return {'error': f'Unknown analysis type: {analysis_type}'}
        except Exception as e:
            return {'error': str(e)}
    
    def extract_information(self, document, extraction_type='entities'):
        """Extract specific information from document content."""
        if not document.content:
            return {'error': 'Document content not available'}
            
        try:
            if extraction_type == 'entities':
                return self._extract_entities(document.content)
            elif extraction_type == 'keywords':
                return self._extract_keywords(document.content)
            elif extraction_type == 'summary':
                return self._generate_summary(document.content)
            else:
                return {'error': f'Unknown extraction type: {extraction_type}'}
        except Exception as e:
            return {'error': str(e)}
    
    def _general_analysis(self, text):
        """Perform general analysis including summary, sentiment, and key entities."""
        return {
            'summary': self._generate_summary(text),
            'sentiment': self._sentiment_analysis(text),
            'entities': self._extract_entities(text),
            'keywords': self._extract_keywords(text)
        }
    
    def _sentiment_analysis(self, text):
        """Analyze sentiment of the text."""
        chunks = self._chunk_text(text, max_length=512)
        sentiments = [self.sentiment_model(chunk)[0] for chunk in chunks]
        
        # Aggregate sentiment scores
        positive_score = sum(1 for s in sentiments if s['label'] == 'POSITIVE') / len(sentiments)
        return {
            'overall_sentiment': 'POSITIVE' if positive_score > 0.5 else 'NEGATIVE',
            'confidence': max(positive_score, 1 - positive_score)
        }
    
    def _entity_analysis(self, text):
        """Analyze named entities in the text."""
        doc = self.ner_model(text)
        entities = {}
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            entities[ent.label_].append(ent.text)
        return {'entities': entities}
    
    def _topic_analysis(self, text):
        """Analyze main topics in the text."""
        topics = self.text_classifier(text, top_k=5)
        return {'topics': topics}
    
    def _extract_entities(self, text):
        """Extract named entities from text."""
        doc = self.ner_model(text)
        return [{'text': ent.text, 'label': ent.label_} for ent in doc.ents]
    
    def _extract_keywords(self, text):
        """Extract key phrases and words from text."""
        doc = self.ner_model(text)
        keywords = [token.text for token in doc if not token.is_stop and not token.is_punct]
        return list(set(keywords))[:10]  # Return top 10 unique keywords
    
    def _generate_summary(self, text):
        """Generate a concise summary of the text."""
        chunks = self._chunk_text(text, max_length=1024)
        summaries = []
        
        for chunk in chunks:
            summary = self.summarizer(chunk, max_length=130, min_length=30, do_sample=False)
            summaries.append(summary[0]['summary_text'])
        
        return ' '.join(summaries)
    
    def _chunk_text(self, text, max_length=512):
        """Split text into chunks of specified maximum length."""
        words = text.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_length = len(word) + 1  # Add 1 for space
            if current_length + word_length > max_length:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = word_length
            else:
                current_chunk.append(word)
                current_length += word_length
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks