# 名字

规则见 ../prompts/meta.md「用户命名」。名字属于身份的可变显示信息，name-pet 不改 ID、soul、图、成长或历史。

完成孵化后读取 naming.due/namingDue。呈现实际新样子与家，在消息末尾请用户自由起名一次，不给候选。实际送出问题后 `name-asked PET_ID --pet PET_ID`；未送出不记为已问。保存提问时 Pet ID，用户回答由 /genpet 接住，`name-pet QUESTION_PET_ID USER_NAME --pet QUESTION_PET_ID` 使用该 ID；若已被替换，说明问题指向原 Pet，不把答复套给新 Pet。

用户暂时不取名或没有回复，故事继续，之后不催问。之后明确说「改名叫 X」直接保存自己的名字；没提供名字只问一句。待完成故事存在时先完成或按原指示解决，不为命名再开故事；同名重试幂等。

保存名字后取 companion-brief，给同一真实 cloud ID 同步最新简介并回读，不按名字查找或新建云 Pet。若同步暂时失败，保留这个已保存的名字和失败证据，下次同步最新简介。

旧记录原有名字保留，不因升级重新邀请。宠物列表条目可继续用运行时的唯一标签 genpet-xxxxxx，名字用于故事、对话与简介；不得按名字定位云 Pet。
