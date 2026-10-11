# 单元：story-item · 故事物件（StoryDesigner）

输入：context、pet、已形成的 story、savedArt。遵循 meta.md「故事物件与家」「图片展示」。

判断这篇故事有没有值得画的关键物件，以及怎样按物件自己的形式表达它。Avatar 与家各有自己的单元，此处不重复生成。需要图时写目的、视角、形式惯例与 mustShow；物件本身是主角，不做普通场景插图。带文字时写原文与语言，先保证自然可读。已有合适物件图直接复用。

结果：`reason` 说明故事为什么需要这个物件或本次无物件；`item` 为 null，或 `{medium, purpose, viewpoint, form, mustShow, text?, visuals}`。medium 开放；form 写清画幅、边框、背景；visuals 含实际请求与参考，复用项指向 artId/file。

检查点：不靠说明就看得出是什么；形式与用途相合；必要特征落实到请求；物件故事与用户真实资料相连、体现它在想什么；没有虚构用户收到、使用或感受；图上文字与正文不重复。item 为 null 不表示纯文字：该故事仍可有 Avatar 或家的变化；实际是否纯文字由全部结果判断。
