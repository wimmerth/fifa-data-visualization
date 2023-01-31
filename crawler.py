from bs4 import BeautifulSoup
from requests import get

class Crawler:
    def __init__(self):
        self.base_site_url = "https://sofifa.com"
        self.next_page_selector = "#adjust > div > div.column.col-auto > div > div > a"

        self.player_base_url = "https://sofifa.com/players?r=230008&set=true"
        self.players_next_page_selector = "#adjust > div > div.column.col-auto > div > div > a"
        self.player_url_selector = "#adjust > div > div.column.col-auto > div > table > " \
                                   "tbody > tr > td > a.tooltip"

    def crawl(self):
        next_page = self.player_base_url
        while next_page:
            response = get(next_page)
            soup = BeautifulSoup(response.text, "html.parser")
            self.get_urls_in_page(soup)
            self.next_page(soup)
    
    def get_urls_in_page(self, soup):
        player_urls = soup.select(self.player_url_selector)
        for url in player_urls:
            self.player_urls.append(self.base_site_url + url.get("href"))
    
    def next_page(self, soup):
        next_page = soup.select(self.next_page_selector)
        if next_page:
            self.next_page = self.base_site_url + next_page[0].get("href")
        else:
            self.next_page = None