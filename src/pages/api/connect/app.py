import os
import re
import json
import time
import hashlib
import requests
from typing import List, Dict, Optional, Set, Tuple
from urllib.parse import quote, urlparse
from datetime import datetime
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False
try:
    import requests.packages.urllib3
    requests.packages.urllib3.disable_warnings()
except:
    pass
CONFIG = {
    'timeout': 10,
    'max_retries': 3,
    'delay_between_requests': 1,
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'output_dir': 'spotify_osint_results',
    'proxy': None,
    'use_selenium': True,
    'use_tor': False,
}
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spotify_osint.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
class SpotifyEmailFinder:
    def __init__(self, config: Dict = None):
        self.config = CONFIG.copy()
        if config:
            self.config.update(config)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config['user_agent'],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        })
        if self.config['proxy']:
            self.session.proxies = {
                'http': self.config['proxy'],
                'https': self.config['proxy']
            }
        self.driver = None
        self.results = {
            'spotify_id': '',
            'spotify_url': '',
            'emails_found': [],
            'methods_used': [],
            'timestamp': datetime.now().isoformat(),
            'confidence_score': 0
        }
        os.makedirs(self.config['output_dir'], exist_ok=True)
    def _init_selenium(self):
        if not HAS_SELENIUM or not self.config['use_selenium']:
            return False
        try:
            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            options.add_argument(f'user-agent={self.config["user_agent"]}')
            if self.config['use_tor']:
                options.add_argument('--proxy-server=socks5://127.0.0.1:9050')
            self.driver = webdriver.Chrome(options=options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            return True
        except Exception as e:
            logger.warning(f"Selenium initialization failed: {e}")
            return False
    def _extract_emails(self, text: str) -> List[str]:
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, text)
        invalid_domains = ['example.com', 'test.com', 'email.com', 'domain.com']
        valid_emails = []
        for email in emails:
            domain = email.split('@')[1].lower()
            if domain not in invalid_domains and len(email) < 254:
                valid_emails.append(email.lower())
        return list(set(valid_emails))
    def _spotify_id_from_url(self, url: str) -> Optional[str]:
        patterns = [
            r'spotify\.com/user/([a-zA-Z0-9]+)',
            r'open\.spotify\.com/user/([a-zA-Z0-9]+)',
            r'spotify:user:([a-zA-Z0-9]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    def _save_results(self):
        filename = f"spotify_{self.results['spotify_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.config['output_dir'], filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to {filepath}")
        return filepath
    def method_spotify_api(self, spotify_url: str) -> List[str]:
        logger.info("🎵 Method 1: Spotify API/Profile scraping")
        emails = []
        user_id = self._spotify_id_from_url(spotify_url)
        if not user_id:
            logger.warning("Could not extract Spotify user ID")
            return emails
        self.results['spotify_id'] = user_id
        self.results['spotify_url'] = spotify_url
        embed_url = f"https://open.spotify.com/embed/user/{user_id}"
        try:
            response = self.session.get(embed_url, timeout=self.config['timeout'])
            if response.status_code == 200:
                data_patterns = [
                    r'"email"\s*:\s*"([^"]+@[^"]+)"',
                    r'data-email="([^"]+)"',
                    r'"owner"\s*:\s*\{[^}]*"email"\s*:\s*"([^"]+)"'
                ]
                for pattern in data_patterns:
                    found = re.findall(pattern, response.text)
                    emails.extend(found)
                if HAS_BS4:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    for script in soup.find_all('script'):
                        if script.string:
                            found = self._extract_emails(script.string)
                            emails.extend(found)
        except Exception as e:
            logger.warning(f"Spotify embed check failed: {e}")
        spotify_client_id = os.getenv('SPOTIFY_CLIENT_ID')
        spotify_client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        if spotify_client_id and spotify_client_secret:
            try:
                auth_response = requests.post(
                    'https://accounts.spotify.com/api/token',
                    data={'grant_type': 'client_credentials'},
                    auth=(spotify_client_id, spotify_client_secret)
                )
                if auth_response.status_code == 200:
                    token = auth_response.json()['access_token']
                    headers = {'Authorization': f'Bearer {token}'}
                    profile_response = requests.get(
                        f'https://api.spotify.com/v1/users/{user_id}',
                        headers=headers
                    )
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        if 'email' in profile_data:
                            emails.append(profile_data['email'])
            except Exception as e:
                logger.warning(f"Spotify API check failed: {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('spotify_api')
        return unique_emails
    def method_google_dorking(self, spotify_url: str) -> List[str]:
        logger.info("🔍 Method 2: Google dorking")
        emails = []
        user_id = self._spotify_id_from_url(spotify_url)
        if not user_id:
            return emails
        dork_queries = [
            f'site:spotify.com "{user_id}" email',
            f'"{user_id}" spotify email',
            f'spotify.com/user/{user_id} email',
            f'"{user_id}" "@gmail.com" OR "@yahoo.com" OR "@hotmail.com"',
            f'intitle:"{user_id}" spotify',
        ]
        for query in dork_queries:
            try:
                encoded_query = quote(query)
                url = f'https://www.google.com/search?q={encoded_query}'
                response = self.session.get(url, timeout=self.config['timeout'])
                if response.status_code == 200:
                    found_emails = self._extract_emails(response.text)
                    emails.extend(found_emails)
                    url_emails = re.findall(r'[a-zA-Z0-9._%+-]+%40[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', response.text)
                    for ue in url_emails:
                        emails.append(ue.replace('%40', '@'))
                time.sleep(self.config['delay_between_requests'])
            except Exception as e:
                logger.warning(f"Google dork query failed for '{query}': {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('google_dorking')
        return unique_emails
    def method_social_media_crossref(self, spotify_url: str) -> List[str]:
        logger.info("👤 Method 3: Social media cross-reference")
        emails = []
        user_id = self._spotify_id_from_url(spotify_url)
        if not user_id:
            return emails
        platforms = [
            {
                'name': 'Instagram',
                'url': f'https://www.instagram.com/{user_id}/',
                'email_pattern': r'"email":"([^"]+@[^"]+)"'
            },
            {
                'name': 'Twitter/X',
                'url': f'https://twitter.com/{user_id}',
                'email_pattern': r'email[=:]"?([^"&\s]+@[^"&\s]+)'
            },
            {
                'name': 'Reddit',
                'url': f'https://www.reddit.com/user/{user_id}/about.json',
                'email_pattern': r'email[":\s]+"?([^"&\s]+@[^"&\s]+)'
            },
            {
                'name': 'GitHub',
                'url': f'https://api.github.com/users/{user_id}',
                'email_pattern': r'"email":\s*"([^"]+)"'
            },
            {
                'name': 'SoundCloud',
                'url': f'https://soundcloud.com/{user_id}',
                'email_pattern': r'email[":]\s*"?([^"&\s]+@[^"&\s]+)'
            },
            {
                'name': 'Last.fm',
                'url': f'https://www.last.fm/user/{user_id}',
                'email_pattern': r'email[":]\s*"?([^"&\s]+@[^"&\s]+)'
            }
        ]
        for platform in platforms:
            try:
                response = self.session.get(
                    platform['url'],
                    timeout=self.config['timeout'],
                    headers={'Accept': 'application/json, text/html'}
                )
                if response.status_code == 200:
                    if 'json' in response.headers.get('Content-Type', ''):
                        try:
                            data = response.json()
                            if 'email' in data:
                                emails.append(data['email'])
                        except:
                            pass
                    found = re.findall(platform['email_pattern'], response.text)
                    emails.extend(found)
                    emails.extend(self._extract_emails(response.text))
                    logger.info(f"  ✅ Found data on {platform['name']}")
                time.sleep(self.config['delay_between_requests'])
            except Exception as e:
                logger.debug(f"  ❌ {platform['name']} check failed: {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('social_media_crossref')
        return unique_emails
    def method_pastebin_leaks(self, spotify_url: str) -> List[str]:
        logger.info("📋 Method 4: Paste site searches")
        emails = []
        user_id = self._spotify_id_from_url(spotify_url)
        if not user_id:
            return emails
        paste_sites = [
            'pastebin.com',
            'paste.ee',
            'justpaste.it',
            'rentry.co',
            'telegra.ph'
        ]
        search_terms = [user_id, spotify_url, f'spotify.com/user/{user_id}']
        for term in search_terms:
            for site in paste_sites:
                try:
                    query = f'site:{site} "{term}"'
                    encoded_query = quote(query)
                    url = f'https://www.google.com/search?q={encoded_query}'
                    response = self.session.get(url, timeout=self.config['timeout'])
                    if response.status_code == 200:
                        result_urls = re.findall(r'https?://[^"]+', response.text)
                        for result_url in result_urls:
                            if any(s in result_url for s in paste_sites):
                                try:
                                    paste_response = self.session.get(result_url, timeout=self.config['timeout'])
                                    if paste_response.status_code == 200:
                                        found_emails = self._extract_emails(paste_response.text)
                                        emails.extend(found_emails)
                                except:
                                    pass
                    time.sleep(self.config['delay_between_requests'])
                except Exception as e:
                    logger.debug(f"Paste search failed for {site}: {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('pastebin_leaks')
        return unique_emails
    def method_gravatar_check(self, emails_to_check: List[str]) -> List[str]:
        logger.info("🖼️ Method 5: Gravatar verification")
        verified_emails = []
        for email in emails_to_check:
            try:
                email_hash = hashlib.md5(email.lower().encode('utf-8')).hexdigest()
                gravatar_url = f'https://www.gravatar.com/{email_hash}?d=404'
                response = self.session.head(gravatar_url, timeout=self.config['timeout'])
                if response.status_code == 200:
                    verified_emails.append(email)
                    logger.info(f"  ✅ Gravatar found for: {email}")
                time.sleep(0.5)
            except Exception as e:
                logger.debug(f"Gravatar check failed for {email}: {e}")
        if verified_emails:
            self.results['methods_used'].append('gravatar_check')
        return verified_emails
    def method_haveibeenpwned(self, emails_to_check: List[str]) -> Dict[str, List[str]]:
        logger.info("🔓 Method 6: HIBP breach check")
        breaches = {}
        for email in emails_to_check:
            try:
                headers = {
                    'hibp-api-key': os.getenv('HIBP_API_KEY', ''),
                    'user-agent': self.config['user_agent']
                }
                response = self.session.get(
                    f'https://haveibeenpwned.com/api/v3/breachedaccount/{email}',
                    headers=headers,
                    timeout=self.config['timeout']
                )
                if response.status_code == 200:
                    breach_data = response.json()
                    breaches[email] = [b['Name'] for b in breach_data]
                    logger.info(f"  🔴 {email} found in {len(breach_data)} breaches")
                elif response.status_code == 404:
                    logger.info(f"  ✅ {email} not found in any breaches")
                time.sleep(1.5)
            except Exception as e:
                logger.warning(f"HIBP check failed for {email}: {e}")
        if breaches:
            self.results['methods_used'].append('haveibeenpwned')
        return breaches
    def method_selenium_scrape(self, spotify_url: str) -> List[str]:
        logger.info("🌐 Method 7: Advanced Selenium scraping")
        emails = []
        if not self.driver and not self._init_selenium():
            logger.warning("Selenium not available, skipping advanced scraping")
            return emails
        try:
            self.driver.get(spotify_url)
            time.sleep(3)
            page_source = self.driver.page_source
            emails.extend(self._extract_emails(page_source))
            emails.extend(self._extract_emails(script_data))
            try:
                emails.extend(self._extract_emails(storage_data))
            except:
                pass
            social_links = self.driver.find_elements(By.CSS_SELECTOR, 'a[href*="instagram"], a[href*="twitter"], a[href*="facebook"]')
            for link in social_links:
                href = link.get_attribute('href')
                logger.info(f"  Found social link: {href}")
        except Exception as e:
            logger.warning(f"Selenium scraping failed: {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('selenium_scrape')
        return unique_emails
    def method_reverse_username_lookup(self, spotify_url: str) -> List[str]:
        logger.info("🔄 Method 8: Reverse username lookup")
        emails = []
        user_id = self._spotify_id_from_url(spotify_url)
        if not user_id:
            return emails
        sites = [
            {
                'name': 'Instagram',
                'url': f'https://www.instagram.com/{user_id}/?__a=1',
                'type': 'json'
            },
            {
                'name': 'Twitter',
                'url': f'https://api.twitter.com/1.1/users/show.json?screen_name={user_id}',
                'type': 'json',
                'bearer_token': os.getenv('TWITTER_BEARER_TOKEN')
            },
            {
                'name': 'GitHub',
                'url': f'https://api.github.com/users/{user_id}/events/public',
                'type': 'json'
            },
            {
                'name': 'TikTok',
                'url': f'https://www.tiktok.com/@{user_id}',
                'type': 'html'
            },
            {
                'name': 'Snapchat',
                'url': f'https://www.snapchat.com/add/{user_id}',
                'type': 'html'
            },
            {
                'name': 'Telegram',
                'url': f'https://t.me/{user_id}',
                'type': 'html'
            },
            {
                'name': 'Discord',
                'url': f'https://discord.com/api/v9/users/{user_id}',
                'type': 'json'
            }
        ]
        for site in sites:
            try:
                headers = {'Accept': 'application/json'} if site['type'] == 'json' else {}
                if 'bearer_token' in site and site['bearer_token']:
                    headers['Authorization'] = f'Bearer {site["bearer_token"]}'
                response = self.session.get(site['url'], headers=headers, timeout=self.config['timeout'])
                if response.status_code == 200:
                    if site['type'] == 'json':
                        try:
                            data = response.json()
                            json_str = json.dumps(data)
                            emails.extend(self._extract_emails(json_str))
                        except:
                            pass
                    else:
                        emails.extend(self._extract_emails(response.text))
                    logger.info(f"  ✅ Found data on {site['name']}")
                time.sleep(self.config['delay_between_requests'])
            except Exception as e:
                logger.debug(f"  ❌ {site['name']} check failed: {e}")
        unique_emails = list(set(emails))
        if unique_emails:
            self.results['methods_used'].append('reverse_username_lookup')
        return unique_emails
    def find_email(self, spotify_url: str) -> Dict:
        logger.info(f"🚀 Starting email discovery for: {spotify_url}")
        logger.info("="*60)
        all_emails = set()
        try:
            emails = self.method_spotify_api(spotify_url)
            all_emails.update(emails)
            logger.info(f"Method 1 found: {len(emails)} emails")
        except Exception as e:
            logger.error(f"Method 1 failed: {e}")
        try:
            emails = self.method_google_dorking(spotify_url)
            all_emails.update(emails)
            logger.info(f"Method 2 found: {len(emails)} emails")
        except Exception as e:
            logger.error(f"Method 2 failed: {e}")
        try:
            emails = self.method_social_media_crossref(spotify_url)
            all_emails.update(emails)
            logger.info(f"Method 3 found: {len(emails)} emails")
        except Exception as e:
            logger.error(f"Method 3 failed: {e}")
        try:
            emails = self.method_pastebin_leaks(spotify_url)
            all_emails.update(emails)
            logger.info(f"Method 4 found: {len(emails)} emails")
        except Exception as e:
            logger.error(f"Method 4 failed: {e}")
        try:
            emails = self.method_reverse_username_lookup(spotify_url)
            all_emails.update(emails)
            logger.info(f"Method 8 found: {len(emails)} emails")
        except Exception as e:
            logger.error(f"Method 8 failed: {e}")
        if self.config['use_selenium']:
            try:
                emails = self.method_selenium_scrape(spotify_url)
                all_emails.update(emails)
                logger.info(f"Method 7 found: {len(emails)} emails")
            except Exception as e:
                logger.error(f"Method 7 failed: {e}")
        if all_emails:
            try:
                self.results['breaches'] = self.method_haveibeenpwned(list(all_emails))
            except Exception as e:
                logger.error(f"Method 6 failed: {e}")
        if all_emails:
            try:
                verified = self.method_gravatar_check(list(all_emails))
                if verified:
                    logger.info(f"✅ Verified {len(verified)} emails via Gravatar")
            except Exception as e:
                logger.error(f"Method 5 failed: {e}")
        self.results['emails_found'] = list(all_emails)
        self.results['confidence_score'] = min(len(self.results['methods_used']) * 15, 100)
        filepath = self._save_results()
        logger.info("\n" + "="*60)
        logger.info("📊 RESULTS SUMMARY")
        logger.info("="*60)
        logger.info(f"🎵 Spotify URL: {spotify_url}")
        logger.info(f"👤 User ID: {self.results['spotify_id']}")
        logger.info(f"📧 Emails found: {len(all_emails)}")
        logger.info(f"🔬 Methods successful: {len(self.results['methods_used'])}")
        logger.info(f"🎯 Confidence score: {self.results['confidence_score']}%")
        if all_emails:
            logger.info("\n📧 Discovered Emails:")
            for email in sorted(all_emails):
                logger.info(f"  • {email}")
        logger.info(f"\n💾 Results saved to: {filepath}")
        return self.results
    def close(self):
        if self.driver:
            self.driver.quit()
            self.driver = None
def main():
    import argparse
    parser = argparse.ArgumentParser(
        description='🔍 Spotify Email OSINT Finder - Find emails associated with Spotify accounts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('spotify_url', nargs='?', help='Spotify profile URL or username')
    parser.add_argument('--url', help='Spotify profile URL (alternative)')
    parser.add_argument('--username', help='Spotify username directly')
    parser.add_argument('--no-selenium', action='store_true', help='Disable Selenium')
    parser.add_argument('--proxy', help='Proxy URL (e.g., socks5://127.0.0.1:9050)')
    parser.add_argument('--tor', action='store_true', help='Route traffic through Tor')
    parser.add_argument('--output', help='Output directory', default='spotify_osint_results')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()
    spotify_url = args.url or args.spotify_url
    spotify_username = args.username
    if spotify_username and not spotify_url:
        spotify_url = f'https://open.spotify.com/user/{spotify_username}'
    if not spotify_url:
        parser.print_help()
        logger.error("Please provide a Spotify URL or username")
        return
    if not spotify_url.startswith('http'):
        spotify_url = f'https://open.spotify.com/user/{spotify_url}'
    config = CONFIG.copy()
    config['use_selenium'] = not args.no_selenium
    config['use_tor'] = args.tor
    config['output_dir'] = args.output
    if args.proxy:
        config['proxy'] = args.proxy
    elif args.tor:
        config['proxy'] = 'socks5://127.0.0.1:9050'
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    finder = SpotifyEmailFinder(config)
    try:
        results = finder.find_email(spotify_url)
        print("\n" + "="*60)
        print("📋 FINAL REPORT")
        print("="*60)
        print(json.dumps({
            'spotify_url': results['spotify_url'],
            'emails_found': len(results['emails_found']),
            'methods_used': results['methods_used'],
            'confidence': f"{results['confidence_score']}%",
            'emails': results['emails_found']
        }, indent=2))
    except KeyboardInterrupt:
        logger.info("\n⚠️ Search interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        finder.close()
if __name__ == '__main__':
    main()