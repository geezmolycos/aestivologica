import json
import collections
import os

def analyze_lojban_rafsi(input_file):
    if not os.path.exists(input_file):
        print(f"错误: 找不到文件 {input_file}")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    vowels = set("aeiou")

    def get_structure_type(word):
        if len(word) != 5: return None
        pattern = "".join(['V' if c.lower() in vowels else 'C' for c in word])
        if pattern == "CVCCV": return "CVCCV"
        elif pattern == "CCVCV": return "CCVCV"
        return None

    # 定义形式及其对应的 CV 结构描述
    # 这里的 key 是形式代号，value 是 (对应的索引位, 描述)
    GISMU_FORMS = {
        "CVCCV": {
            "123": ("CVC", lambda w: w[0]+w[1]+w[2]),
            "124": ("CVC", lambda w: w[0]+w[1]+w[3]),
            "12'5": ("CV'V", lambda w: w[0]+w[1]+"'"+w[4]),
            "125": ("CVV", lambda w: w[0]+w[1]+w[4]),
            "345": ("CCV", lambda w: w[2]+w[3]+w[4]),
            "132": ("CCV", lambda w: w[0]+w[2]+w[1])
        },
        "CCVCV": {
            "134": ("CVC", lambda w: w[0]+w[2]+w[3]),
            "234": ("CVC", lambda w: w[1]+w[2]+w[3]),
            "13'5": ("CV'V", lambda w: w[0]+w[2]+"'"+w[4]),
            "135": ("CVV", lambda w: w[0]+w[2]+w[4]),
            "23'5": ("CV'V", lambda w: w[1]+w[2]+"'"+w[4]),
            "235": ("CVV", lambda w: w[1]+w[2]+w[4]),
            "123": ("CCV", lambda w: w[0]+w[1]+w[2])
        }
    }

    gismu_stats = collections.defaultdict(list) 
    non_gismu_data = [] 
    ambiguous_rafsi = [] # 记录匹配到多种形式的 rafsi

    for entry in data:
        word = entry.get("word", "").strip()
        w_type = entry.get("word_type", "")
        rafsi_str = entry.get("rafsi", "")
        if not rafsi_str: continue
            
        rafsi_list = [r.strip() for r in rafsi_str.split() if r.strip()]
        
        if w_type == "gismu":
            struct_type = get_structure_type(word)
            if struct_type:
                rules = GISMU_FORMS[struct_type]
                for r in rafsi_list:
                    matched_forms = []
                    for form_id, (cv_label, func) in rules.items():
                        if func(word) == r:
                            full_label = f"{struct_type}-{form_id}-{cv_label}"
                            matched_forms.append(full_label)
                    
                    if matched_forms:
                        # 记录到统计中
                        for f_label in matched_forms:
                            gismu_stats[f_label].append((r, word))
                        # 如果匹配多于一种形式，记录到歧义列表
                        if len(matched_forms) > 1:
                            ambiguous_rafsi.append({
                                "rafsi": r,
                                "word": word,
                                "matched": matched_forms
                            })
                    else:
                        # 无法匹配已知规则的 gismu rafsi
                        gismu_stats["UNKNOWN"].append((r, word))
            else:
                non_gismu_data.append((word, w_type, rafsi_list))
        else:
            non_gismu_data.append((word, w_type, rafsi_list))

    # --- 写入文件 1: Gismu 统计报告 ---
    with open("gismu_rafsi_report.txt", "w", encoding='utf-8') as f:
        f.write("=== LOJBAN GISMU RAFSI 统计报告 ===\n\n")
        
        # 排序：按 CVCCV 和 CCVCV 分类输出
        sorted_labels = sorted([k for k in gismu_stats.keys() if k != "UNKNOWN"])
        
        for label in sorted_labels:
            count = len(gismu_stats[label])
            print(f"【形式 {label}】 数量: {count}")
            f.write(f"【形式 {label}】 数量: {count}\n")
            f.write("-" * 50 + "\n")
            for r, w in gismu_stats[label]:
                f.write(f"  {r}  <--  {w}\n")
            f.write("\n")

        if ambiguous_rafsi:
            f.write("\n=== 对应多种形式的 Rafsi 列表 ===\n")
            f.write("部分 rafsi 因为字母重复，可以被推导为多种形式：\n")
            for item in ambiguous_rafsi:
                f.write(f"  rafsi: {item['rafsi']} (来自 {item['word']}) 匹配形式: {', '.join(item['matched'])}\n")

        if gismu_stats["UNKNOWN"]:
            f.write("\n=== 无法识别形式的 Gismu Rafsi ===\n")
            for r, w in gismu_stats["UNKNOWN"]:
                f.write(f"  {r} (来自 {w})\n")

    # --- 写入文件 2: 非 Gismu 报告 ---
    with open("non_gismu_rafsi_report.txt", "w", encoding='utf-8') as f:
        f.write(f"=== 非 Gismu 词语统计 (共 {len(non_gismu_data)} 词) ===\n\n")
        for word, w_type, rafsi_list in non_gismu_data:
            f.write(f"[{w_type}] {word}: {', '.join(rafsi_list)}\n")

    print(f"分析完成！")
    print(f"1. Gismu 统计详情及歧义项: gismu_rafsi_report.txt")
    print(f"2. 非 Gismu 词语列表: non_gismu_rafsi_report.txt")

if __name__ == "__main__":
    analyze_lojban_rafsi("dictionary-en.json")