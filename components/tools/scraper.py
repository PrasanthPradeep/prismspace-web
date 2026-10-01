# Copyright 2026 Nobin Sijo (NobinSijo7T).
# SPDX-License-Identifier: Apache-2.0
import requests
from bs4 import BeautifulSoup
import json
import time
import os
from urllib.parse import urljoin, urlparse
import re

# Configuration
BASE_URL = "https://www.theatrejs.com/docs/latest"
OUTPUT_DIR = "theatrejs_docs"
DELAY = 1  # seconds between requests (be respectful)

headers = {
    "User-Agent": "Mozilla/5.0 (compatible; TheatreDocsScraper/1.0)"
}

session = requests.Session()
session.headers.update(headers)

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

def is_valid_doc_url(url):
    """Filter only documentation pages"""
    if not url.startswith(BASE_URL):
        return False
    parsed = urlparse(url)
    path = parsed.path
    return (
        "/docs/latest" in path and
        not any(ext in path for ext in ['.png', '.jpg', '.gif', '.svg', '.pdf'])
    )

def get_page_content(url):
    """Fetch and parse a single page"""
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for tag in soup.select('nav, footer, script, style, button, .feedback'):
            tag.decompose()
        
        title = soup.find('h1')
        title_text = title.get_text(strip=True) if title else "Untitled"
        
        # Get main content
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile('content|markdown|prose'))
        
        if main_content:
            content = main_content.get_text(separator='\n', strip=True)
        else:
            content = soup.get_text(separator='\n', strip=True)
        
        # Clean up excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return {
            "url": url,
            "title": title_text,
            "content": content.strip(),
            "raw_html": str(main_content) if main_content else None
        }
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def find_all_doc_links(start_url):
    """Crawl and collect all documentation links"""
    visited = set()
    to_visit = [start_url]
    all_pages = {}
    
    print("🔍 Discovering all documentation pages...")
    
    while to_visit:
        url = to_visit.pop(0)
        if url in visited:
            continue
            
        visited.add(url)
        print(f"  📄 Scanning: {url}")
        
        try:
            response = session.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for link in soup.find_all('a', href=True):
                full_url = urljoin(BASE_URL, link['href'])
                if is_valid_doc_url(full_url) and full_url not in visited:
                    to_visit.append(full_url)
                    all_pages[full_url] = None
                    
        except Exception as e:
            print(f"    ⚠️  Could not scan {url}: {e}")
        
        time.sleep(DELAY)
    
    return list(all_pages.keys())

def scrape_all_docs():
    """Main scraping function"""
    print(f"🚀 Starting scrape of {BASE_URL}")
    
    # Discover all pages
    doc_urls = find_all_doc_links(BASE_URL)
    print(f"✅ Found {len(doc_urls)} documentation pages\n")
    
    docs = []
    
    for i, url in enumerate(doc_urls, 1):
        print(f"[{i:2d}/{len(doc_urls)}] Scraping: {url}")
        page_data = get_page_content(url)
        
        if page_data:
            docs.append(page_data)
            # Save individual file
            safe_name = re.sub(r'[^a-zA-Z0-9\-_]', '_', page_data['title'])[:100]
            filename = f"{OUTPUT_DIR}/{safe_name}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(page_data, f, indent=2, ensure_ascii=False)
        
        time.sleep(DELAY)
    
    # Save complete dataset
    with open(f"{OUTPUT_DIR}/theatrejs_full_docs.json", 'w', encoding='utf-8') as f:
        json.dump({
            "library": "Theatre.js",
            "version": "latest",
            "base_url": BASE_URL,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_pages": len(docs),
            "pages": docs
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n🎉 Scraping completed! {len(docs)} pages saved to ./{OUTPUT_DIR}/")

if __name__ == "__main__":
    scrape_all_docs()
