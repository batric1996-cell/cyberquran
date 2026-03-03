import json, os, re
import xml.etree.ElementTree as ET

def normalize(t):
    if not t: return ""
    # إزالة التشكيل ورموز الوقف للمطابقة الصوتية
    t = re.sub(r'[\u064B-\u065F\u0670\u06d6-\u06ed]', '', t)
    t = t.replace('أ','ا').replace('إ','ا').replace('آ','ا')
    t = t.replace('ة','ه').replace('ى','ي')
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def run():
    xml_file = 'Arabic-(Original-Book)-1.xml'
    try:
        if not os.path.exists('data'): os.makedirs('data')
        print(f"📖 جاري معالجة المصحف من: {xml_file}")
        
        tree = ET.parse(xml_file)
        root = tree.getroot()
        index = []
        os.makedirs("js/modules", exist_ok=True)
        
        for chapter in root.findall('Chapter'):
            s_id = int(chapter.get('ChapterID'))
            s_name = chapter.get('ChapterName')
            ayahs_list = []
            
            for verse in chapter.findall('Verse'):
                a_id = int(verse.get('VerseID'))
                txt = verse.text.strip() if verse.text else ""
                # تخزين الكلمة مشكلة للعرض ونظيفة للمطابقة
                words = [{"display": w.strip(), "match": normalize(w.strip())} for w in txt.split() if w.strip()]
                ayahs_list.append({"number": a_id, "words": words})
            
            fname = f"surah_{str(s_id).zfill(3)}.json"
            with open(f"data/{fname}", 'w', encoding='utf-8') as f:
                json.dump({"surah": s_id, "name": s_name, "ayahs": ayahs_list}, f, ensure_ascii=False)
            
            index.append({"id": s_id, "name": s_name, "file": fname, "ayahCount": len(ayahs_list)})
            print(f"✅ تم إنتاج: {s_name}")
            
        with open('js/modules/surahs.js', 'w', encoding='utf-8') as f:
            f.write(f"const SURAHS_INDEX = {json.dumps(index, ensure_ascii=False)};\nObject.freeze(SURAHS_INDEX);")
        
        print("\n✨ اكتملت العملية! جميع السور الـ 114 جاهزة بالتشكيل.")
    except Exception as e:
        print(f"❌ خطأ: {e}")

if __name__ == '__main__': run()

