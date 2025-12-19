# --- 配置参数 ---

# 1. "Half" 阶段配置
HALF_PREFIX = "gen_half_"
HALF_MOVE = (0.5, 16)
HALF_SCALE = (0.5, 1)
# 克隆的相对移动列表
HALF_CLONE_OFFSETS = [
    (16, 0),
    (23, 0)
]

HALFHR_PREFIX = "gen_halfhr_"
HALFHR_MOVE = (0, 16)
HALFHR_SCALE = (1, 0.5)
# 克隆的相对移动列表
HALFHR_CLONE_OFFSETS = [
    (16, 0),
    (16, 7.5)
]

# 2. "Quarter" 阶段配置
QUARTER_PREFIX = "gen_quarter_"
QUARTER_MOVE = (0.5, 32.5)
QUARTER_SCALE = (0.5, 0.5)
# 克隆的相对移动列表
QUARTER_CLONE_OFFSETS = [
    (7, 0),
    (0, 6.5),
    (7, 6.5),
    (16, 0),
    (16, 6.5),
]

# --- 核心逻辑 ---

def process_object(original, prefix, move_delta, scale_factor, clone_offsets):
    
    coord_lefttop = (float('inf'), float('inf'))
    for item in original:
        coord_lefttop = (min(coord_lefttop[0], item.bounding_box().left), min(coord_lefttop[1], item.bounding_box().top))
    
    # 将 left top 这点变成 0, 0
    # 内部坐标 coord 0, 0 不动，缩放曲线
    duplicated_children = []
    for item in original:
        if item.svg_get('inkscape:label') == 'borderline':
            continue
        # assume is group
        new_item = duplicate(item)
        duplicated_children.append(new_item)
        path = item._inkscape_obj.path
        path = path.transform(item.transform).translate(-coord_lefttop[0], -coord_lefttop[1]).scale(scale_factor[0], scale_factor[1])
        new_item._inkscape_obj.set('d', path)
        new_item.transform = inkex.transforms.Transform(((1.0, 0.0, 0.0), (0.0, 1.0, 0.0)))
        # print(item.svg_get('id'), item.transform.matrix, '\n', item._inkscape_obj.path, '\n\n', item._inkscape_obj.path.bounding_box().left, item._inkscape_obj.path.bounding_box().top, '\n')
        
    
    new_group = group(duplicated_children)
    
    new_group_name = prefix + original.svg_get('inkscape:label')
    new_group.svg_set('inkscape:label', new_group_name)
    
    new_group.transform = inkex.transforms.Transform(original.transform.matrix).add_translate(coord_lefttop).add_translate(move_delta)
    
    # 创建 克隆 (clone) 并移动
    for offset in clone_offsets:
        # 创建克隆
        c = clone(new_group)
        c.svg_set('inkscape:label', prefix + c.svg_get('id'))
        # 移动克隆体，offset 是相对于原件的额外位移
        c.translate(offset)

for obj in all_shapes():
    label = obj.svg_get('inkscape:label')
    if isinstance(label, str) and label.startswith('gen_'):
        if isinstance(obj, SimpleGroup):
            while len(obj) > 0:
                try:
                    obj[-1].remove()
                except Exception:
                    pass
        obj.remove()


for obj in all_shapes():
    label = obj.svg_get('inkscape:label')
    if isinstance(label, str) and (label.startswith('consonant_') or label.startswith('vowel_')):
        # 执行第一阶段 (Half)
        process_object(obj, HALF_PREFIX, HALF_MOVE, HALF_SCALE, HALF_CLONE_OFFSETS)

        # 执行第二阶段 (Quarter)
        # 再次使用 target，保证 Quarter 也是从原件复制
        process_object(obj, QUARTER_PREFIX, QUARTER_MOVE, QUARTER_SCALE, QUARTER_CLONE_OFFSETS)
    if isinstance(label, str) and label.startswith('vowelhr_'):
        # 执行第一阶段 (Half)
        process_object(obj, HALFHR_PREFIX, HALFHR_MOVE, HALFHR_SCALE, HALFHR_CLONE_OFFSETS)

        # 执行第二阶段 (Quarter)
        # 再次使用 target，保证 Quarter 也是从原件复制
        process_object(obj, QUARTER_PREFIX, QUARTER_MOVE, QUARTER_SCALE, QUARTER_CLONE_OFFSETS)