import ollama
import requests
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
from ddgs import DDGS

app = FastAPI()

# Enable CORS so our HTML file can talk to our Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def search_and_scrape(query: str):
    with DDGS() as ddgs:
        results = [r for r in ddgs.text(query, max_results=3)]
    
    context = ""
    sources = []
    for r in results:
        try:
            res = requests.get(r['href'], timeout=5, headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(res.text, 'html.parser')
            text = ' '.join([p.text for p in soup.find_all('p')])[:1500]
            context += f"\nSource: {r['title']}\nContent: {text}\n"
            sources.append({"title": r['title'], "url": r['href']})
        except:
            continue
    return context, sources

@app.get("/ask")
async def ask_ai(q: str = Query(...)):
    context, sources = search_and_scrape(q)
    
    prompt = f"Using this web data:\n{context}\n\nAnswer the user: {q}. Be concise and cite sources."
    
    # Talk to local Ollama
    response = ollama.generate(model='llama3.2:1b', prompt=prompt)
    
    return {"answer": response['response'], "sources": sources}